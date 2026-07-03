import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ouraGetAll } from '../providers/oura.js';
import {
  dateParams,
  jsonResult,
  resolveRange,
  responseFormatParam,
  runTool,
  toMinutes,
} from './helpers.js';

interface DailySleep {
  day: string;
  score: number | null;
  contributors: Record<string, number | null>;
}

interface SleepSession {
  day: string;
  type: string;
  bedtime_start: string;
  bedtime_end: string;
  total_sleep_duration: number | null;
  deep_sleep_duration: number | null;
  rem_sleep_duration: number | null;
  light_sleep_duration: number | null;
  awake_time: number | null;
  latency: number | null;
  time_in_bed: number;
  efficiency: number | null;
  average_heart_rate: number | null;
  lowest_heart_rate: number | null;
  average_hrv: number | null;
  average_breath: number | null;
  restless_periods: number | null;
}

interface SleepTime {
  day: string;
  optimal_bedtime: { start_offset: number; end_offset: number; day_tz: number } | null;
  recommendation: string | null;
  status: string;
}

export function registerSleepTools(server: McpServer): void {
  server.registerTool(
    'oura_get_sleep',
    {
      title: 'Sleep scores',
      description:
        'Daily sleep scores (0-100) with contributor scores (deep sleep, REM, latency, timing, etc.). ' +
        'Use for "how did I sleep" questions. For bedtimes, sleep stages in minutes, or night heart rate use oura_get_sleep_detail instead. ' +
        'Defaults to the last 7 days.',
      inputSchema: { ...dateParams },
      annotations: { readOnlyHint: true },
    },
    async ({ start_date, end_date }) =>
      runTool('oura_get_sleep', { start_date, end_date }, async () => {
        const days = await ouraGetAll<DailySleep>(
          'usercollection/daily_sleep',
          resolveRange(start_date, end_date),
        );
        return jsonResult({
          days: days.map((d) => ({
            day: d.day,
            score: d.score,
            contributors: d.contributors,
          })),
        });
      }),
  );

  server.registerTool(
    'oura_get_sleep_detail',
    {
      title: 'Sleep details per night',
      description:
        'Per-night sleep sessions: bed and wake times, sleep stages in minutes (deep/REM/light/awake), ' +
        'latency, efficiency, night heart rate, HRV and breathing rate. Also returns bedtime recommendations when Oura has them. ' +
        'Use for "when did I fall asleep", "how much deep sleep", "what was my pulse at night". Defaults to the last 7 days.',
      inputSchema: { ...dateParams, response_format: responseFormatParam },
      annotations: { readOnlyHint: true },
    },
    async ({ start_date, end_date, response_format }) =>
      runTool('oura_get_sleep_detail', { start_date, end_date, response_format }, async () => {
        const range = resolveRange(start_date, end_date);
        const [sessions, sleepTimes] = await Promise.allSettled([
          ouraGetAll<SleepSession>('usercollection/sleep', range),
          ouraGetAll<SleepTime>('usercollection/sleep_time', range),
        ]);
        const detailed = response_format === 'detailed';
        const nights = (sessions.status === 'fulfilled' ? sessions.value : []).map((s) => ({
          day: s.day,
          type: s.type,
          bedtime_start: s.bedtime_start,
          bedtime_end: s.bedtime_end,
          total_sleep_min: toMinutes(s.total_sleep_duration),
          deep_min: toMinutes(s.deep_sleep_duration),
          rem_min: toMinutes(s.rem_sleep_duration),
          light_min: toMinutes(s.light_sleep_duration),
          awake_min: toMinutes(s.awake_time),
          latency_min: toMinutes(s.latency),
          efficiency_pct: s.efficiency,
          avg_heart_rate: s.average_heart_rate,
          lowest_heart_rate: s.lowest_heart_rate,
          avg_hrv: s.average_hrv,
          ...(detailed && {
            time_in_bed_min: toMinutes(s.time_in_bed),
            avg_breath_per_min: s.average_breath,
            restless_periods: s.restless_periods,
          }),
        }));
        const guidance = (sleepTimes.status === 'fulfilled' ? sleepTimes.value : [])
          .filter((t) => t.recommendation)
          .map((t) => ({ day: t.day, recommendation: t.recommendation }));
        return jsonResult({ nights, ...(guidance.length && { bedtime_guidance: guidance }) });
      }),
  );
}
