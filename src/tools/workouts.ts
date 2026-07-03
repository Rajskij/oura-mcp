import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ouraGetAll } from '../providers/oura.js';
import { dateParams, jsonResult, resolveRange, runTool, settled } from './helpers.js';

interface Workout {
  day: string;
  activity: string;
  intensity: string | null;
  calories: number | null;
  distance: number | null;
  start_datetime: string;
  end_datetime: string;
  source: string;
  label: string | null;
}

interface Session {
  day: string;
  type: string;
  start_datetime: string;
  end_datetime: string;
  mood: string | null;
}

interface EnhancedTag {
  start_day: string;
  start_time: string | null;
  tag_type_code: string | null;
  custom_name: string | null;
  comment: string | null;
}

export function registerWorkoutTools(server: McpServer): void {
  server.registerTool(
    'oura_get_workouts',
    {
      title: 'Workouts and sessions',
      description:
        'Workouts (activity type, intensity, calories, distance, start/end times) plus mind-body sessions ' +
        '(meditation, breathing, relaxation). Use for "how was my run", "did I work out", "did I meditate". ' +
        'Defaults to the last 7 days.',
      inputSchema: { ...dateParams },
      annotations: { readOnlyHint: true },
    },
    async ({ start_date, end_date }) =>
      runTool('oura_get_workouts', { start_date, end_date }, async () => {
        const range = resolveRange(start_date, end_date);
        const [workouts, sessions] = await Promise.allSettled([
          ouraGetAll<Workout>('usercollection/workout', range),
          ouraGetAll<Session>('usercollection/session', range),
        ]);
        return jsonResult({
          workouts: (settled(workouts) ?? []).map((w) => ({
            day: w.day,
            activity: w.label ?? w.activity,
            intensity: w.intensity,
            calories: w.calories,
            distance_m: w.distance,
            start: w.start_datetime,
            end: w.end_datetime,
            source: w.source,
          })),
          sessions: (settled(sessions) ?? []).map((s) => ({
            day: s.day,
            type: s.type,
            start: s.start_datetime,
            end: s.end_datetime,
            mood: s.mood,
          })),
        });
      }),
  );

  server.registerTool(
    'oura_get_tags',
    {
      title: 'User tags',
      description:
        'Tags the user logged in the Oura app: caffeine, alcohol, sickness, medication, custom notes, etc. ' +
        'Useful context when explaining why sleep or readiness changed. Read-only: tags can only be created in the Oura app. ' +
        'Defaults to the last 7 days.',
      inputSchema: { ...dateParams },
      annotations: { readOnlyHint: true },
    },
    async ({ start_date, end_date }) =>
      runTool('oura_get_tags', { start_date, end_date }, async () => {
        const tags = await ouraGetAll<EnhancedTag>(
          'usercollection/enhanced_tag',
          resolveRange(start_date, end_date),
        );
        return jsonResult({
          tags: tags.map((t) => ({
            day: t.start_day,
            time: t.start_time,
            tag: t.custom_name ?? t.tag_type_code,
            comment: t.comment,
          })),
        });
      }),
  );
}
