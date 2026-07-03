import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ouraGetAll } from '../providers/oura.js';
import { dateParams, jsonResult, resolveRange, runTool, settled } from './helpers.js';

/** Slow-moving health metrics grouped into one tool: SpO2, resilience, cardio age, VO2 max. */

interface DailySpo2 {
  day: string;
  spo2_percentage: { average: number } | null;
  breathing_disturbance_index: number | null;
}

interface DailyResilience {
  day: string;
  level: string;
  contributors: Record<string, number | null>;
}

interface DailyCardioAge {
  day: string;
  vascular_age: number | null;
}

interface Vo2Max {
  day: string;
  vo2_max: number | null;
}

export function registerVitalsTools(server: McpServer): void {
  server.registerTool(
    'oura_get_vitals',
    {
      title: 'Health vitals',
      description:
        'Slow-moving health metrics in one call: blood oxygen (SpO2 average % and breathing disturbance index), ' +
        'resilience level (how well the body handles stress long-term), cardiovascular age, and VO2 max. ' +
        'Use for "what is my SpO2 / vascular age / VO2 max / resilience". Sections the ring does not measure come back empty. ' +
        'Defaults to the last 7 days.',
      inputSchema: { ...dateParams },
      annotations: { readOnlyHint: true },
    },
    async ({ start_date, end_date }) =>
      runTool('oura_get_vitals', { start_date, end_date }, async () => {
        const range = resolveRange(start_date, end_date);
        const [spo2, resilience, cardioAge, vo2max] = await Promise.allSettled([
          ouraGetAll<DailySpo2>('usercollection/daily_spo2', range),
          ouraGetAll<DailyResilience>('usercollection/daily_resilience', range),
          ouraGetAll<DailyCardioAge>('usercollection/daily_cardiovascular_age', range),
          ouraGetAll<Vo2Max>('usercollection/vO2_max', range),
        ]);
        return jsonResult({
          spo2: (settled(spo2) ?? []).map((d) => ({
            day: d.day,
            average_pct: d.spo2_percentage?.average ?? null,
            breathing_disturbance_index: d.breathing_disturbance_index,
          })),
          resilience: (settled(resilience) ?? []).map((d) => ({
            day: d.day,
            level: d.level,
          })),
          cardiovascular_age: (settled(cardioAge) ?? []).map((d) => ({
            day: d.day,
            vascular_age: d.vascular_age,
          })),
          vo2_max: (settled(vo2max) ?? []).map((d) => ({
            day: d.day,
            vo2_max: d.vo2_max,
          })),
        });
      }),
  );
}
