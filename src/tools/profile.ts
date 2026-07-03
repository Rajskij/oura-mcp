import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ouraGet, ouraGetAll } from '../providers/oura.js';
import { daysAgo, isoDate, jsonResult, runTool, settled } from './helpers.js';

interface PersonalInfo {
  age: number | null;
  weight: number | null;
  height: number | null;
  biological_sex: string | null;
}

interface RingConfiguration {
  color: string | null;
  design: string | null;
  hardware_type: string | null;
  size: number | null;
  firmware_version: string | null;
}

interface RingBattery {
  timestamp: string;
  level: number | null;
  charging: boolean | null;
}

export function registerProfileTools(server: McpServer): void {
  server.registerTool(
    'oura_get_profile',
    {
      title: 'Profile and ring status',
      description:
        'User profile (age, biological sex, height in meters, weight in kg) plus ring info: model, size, ' +
        'firmware and current battery level. Use for "how charged is my ring", "what does Oura know about me". ' +
        'Email is never returned.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      runTool('oura_get_profile', {}, async () => {
        const range = { start_date: daysAgo(7), end_date: isoDate(new Date()) };
        const [info, ring, battery] = await Promise.allSettled([
          ouraGet<PersonalInfo>('usercollection/personal_info'),
          ouraGetAll<RingConfiguration>('usercollection/ring_configuration', range),
          ouraGetAll<RingBattery>('usercollection/ring_battery_level', range),
        ]);
        const infoVal = settled(info);
        const latestRing = (settled(ring) ?? []).at(-1) ?? null;
        const latestBattery = (settled(battery) ?? []).at(-1) ?? null;
        return jsonResult({
          user: infoVal
            ? {
                age: infoVal.age,
                biological_sex: infoVal.biological_sex,
                height_m: infoVal.height,
                weight_kg: infoVal.weight,
              }
            : null,
          ring: latestRing
            ? {
                model: latestRing.hardware_type,
                design: latestRing.design,
                color: latestRing.color,
                size: latestRing.size,
                firmware: latestRing.firmware_version,
              }
            : null,
          battery: latestBattery
            ? {
                level_pct: latestBattery.level,
                charging: latestBattery.charging,
                as_of: latestBattery.timestamp,
              }
            : null,
        });
      }),
  );
}
