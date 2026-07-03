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

/** Daily score tools: readiness, activity, stress. */

interface DailyReadiness {
  day: string;
  score: number | null;
  temperature_deviation: number | null;
  contributors: Record<string, number | null>;
}

interface DailyActivity {
  day: string;
  score: number | null;
  steps: number;
  active_calories: number;
  total_calories: number;
  equivalent_walking_distance: number;
  high_activity_time: number;
  medium_activity_time: number;
  low_activity_time: number;
  sedentary_time: number;
  resting_time: number;
  non_wear_time: number;
  average_met_minutes: number;
  inactivity_alerts: number;
}

interface DailyStress {
  day: string;
  day_summary: string | null;
  stress_high: number | null;
  recovery_high: number | null;
}

export function registerDailyTools(server: McpServer): void {
  server.registerTool(
    'oura_get_readiness',
    {
      title: 'Readiness scores',
      description:
        'Daily readiness scores (0-100) showing how recovered the body is, with contributors ' +
        '(HRV balance, resting heart rate, sleep balance, body temperature) and temperature deviation in °C. ' +
        'Use for "how recovered am I", "should I train today", "is my temperature elevated". Defaults to the last 7 days.',
      inputSchema: { ...dateParams },
      annotations: { readOnlyHint: true },
    },
    async ({ start_date, end_date }) =>
      runTool('oura_get_readiness', { start_date, end_date }, async () => {
        const days = await ouraGetAll<DailyReadiness>(
          'usercollection/daily_readiness',
          resolveRange(start_date, end_date),
        );
        return jsonResult({
          days: days.map((d) => ({
            day: d.day,
            score: d.score,
            temperature_deviation_c: d.temperature_deviation,
            contributors: d.contributors,
          })),
        });
      }),
  );

  server.registerTool(
    'oura_get_activity',
    {
      title: 'Activity: steps and calories',
      description:
        'Daily activity: score (0-100), steps, active and total calories. ' +
        "response_format 'detailed' adds minutes by intensity (high/medium/low), sedentary and resting minutes, walking distance. " +
        'Use for "how many steps", "how active was I", "did I move enough". Defaults to the last 7 days.',
      inputSchema: { ...dateParams, response_format: responseFormatParam },
      annotations: { readOnlyHint: true },
    },
    async ({ start_date, end_date, response_format }) =>
      runTool('oura_get_activity', { start_date, end_date, response_format }, async () => {
        const days = await ouraGetAll<DailyActivity>(
          'usercollection/daily_activity',
          resolveRange(start_date, end_date),
        );
        const detailed = response_format === 'detailed';
        return jsonResult({
          days: days.map((d) => ({
            day: d.day,
            score: d.score,
            steps: d.steps,
            active_calories: d.active_calories,
            total_calories: d.total_calories,
            ...(detailed && {
              high_activity_min: toMinutes(d.high_activity_time),
              medium_activity_min: toMinutes(d.medium_activity_time),
              low_activity_min: toMinutes(d.low_activity_time),
              sedentary_min: toMinutes(d.sedentary_time),
              resting_min: toMinutes(d.resting_time),
              non_wear_min: toMinutes(d.non_wear_time),
              walking_distance_m: d.equivalent_walking_distance,
              average_met_minutes: d.average_met_minutes,
              inactivity_alerts: d.inactivity_alerts,
            }),
          })),
        });
      }),
  );

  server.registerTool(
    'oura_get_stress',
    {
      title: 'Daily stress',
      description:
        'Daily stress summary: minutes of high stress, minutes of high recovery, and a day verdict ' +
        "(e.g. 'restored', 'normal', 'stressful'). Use for \"how stressed was I\", \"did I recover today\". Defaults to the last 7 days.",
      inputSchema: { ...dateParams },
      annotations: { readOnlyHint: true },
    },
    async ({ start_date, end_date }) =>
      runTool('oura_get_stress', { start_date, end_date }, async () => {
        const days = await ouraGetAll<DailyStress>(
          'usercollection/daily_stress',
          resolveRange(start_date, end_date),
        );
        return jsonResult({
          days: days.map((d) => ({
            day: d.day,
            day_summary: d.day_summary,
            stress_high_min: toMinutes(d.stress_high),
            recovery_high_min: toMinutes(d.recovery_high),
          })),
        });
      }),
  );
}
