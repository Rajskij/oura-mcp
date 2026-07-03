import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ouraGetAll } from '../providers/oura.js';
import { errorResult, jsonResult, runTool } from './helpers.js';

/**
 * Heart rate comes as a raw time series (a sample every few minutes, 24/7).
 * Raw data for even one day would blow the client's token budget, so this tool
 * always aggregates to hourly stats and caps the range at 3 days.
 */

const MAX_RANGE_MS = 3 * 24 * 60 * 60 * 1000;

export interface HeartRateSample {
  bpm: number;
  source: string;
  timestamp: string;
}

export interface HourlyHeartRate {
  hour: string;
  avg_bpm: number;
  min_bpm: number;
  max_bpm: number;
  samples: number;
}

/** Oura wants ISO 8601 with an explicit offset; normalize whatever we got. */
export function toOuraDatetime(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  return d.toISOString().slice(0, 19) + '+00:00';
}

/** Bucket raw samples into chronologically sorted hourly stats. */
export function aggregateHourly(samples: HeartRateSample[]): HourlyHeartRate[] {
  const byHour = new Map<string, { sum: number; min: number; max: number; n: number }>();
  for (const s of samples) {
    const hour = s.timestamp.slice(0, 13) + ':00Z';
    const agg = byHour.get(hour) ?? { sum: 0, min: Infinity, max: -Infinity, n: 0 };
    agg.sum += s.bpm;
    agg.min = Math.min(agg.min, s.bpm);
    agg.max = Math.max(agg.max, s.bpm);
    agg.n += 1;
    byHour.set(hour, agg);
  }
  return [...byHour.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, a]) => ({
      hour,
      avg_bpm: Math.round(a.sum / a.n),
      min_bpm: a.min,
      max_bpm: a.max,
      samples: a.n,
    }));
}

export function registerHeartrateTools(server: McpServer): void {
  server.registerTool(
    'oura_get_heartrate',
    {
      title: 'Heart rate (hourly)',
      description:
        'Heart rate aggregated per hour (avg/min/max bpm and sample count) across day and night. ' +
        'Use for "what was my pulse today/this afternoon". For sleep-time heart rate prefer oura_get_sleep_detail. ' +
        'Range is capped at 3 days; defaults to the last 24 hours.',
      inputSchema: {
        start_datetime: z
          .string()
          .optional()
          .describe('Range start, ISO 8601 (e.g. 2026-07-02T00:00:00Z). Default: 24 hours ago.'),
        end_datetime: z.string().optional().describe('Range end, ISO 8601. Default: now.'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ start_datetime, end_datetime }) =>
      runTool('oura_get_heartrate', { start_datetime, end_datetime }, async () => {
        const end = end_datetime ? new Date(end_datetime) : new Date();
        const start = start_datetime
          ? new Date(start_datetime)
          : new Date(end.getTime() - 24 * 60 * 60 * 1000);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return errorResult('Invalid datetime. Use ISO 8601, e.g. 2026-07-02T00:00:00Z.');
        }
        if (end.getTime() - start.getTime() > MAX_RANGE_MS) {
          return errorResult(
            'Range too large for heart rate data. Ask for 3 days or less, or use oura_get_sleep_detail / oura_get_readiness for longer trends.',
          );
        }
        const samples = await ouraGetAll<HeartRateSample>(
          'usercollection/heartrate',
          { start_datetime: toOuraDatetime(start), end_datetime: toOuraDatetime(end) },
          10,
        );
        return jsonResult({ hours: aggregateHourly(samples) });
      }),
  );
}
