import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDailyTools } from './daily.js';
import { registerHeartrateTools } from './heartrate.js';
import { registerProfileTools } from './profile.js';
import { registerSleepTools } from './sleep.js';
import { registerVitalsTools } from './vitals.js';
import { registerWorkoutTools } from './workouts.js';

export function registerAllTools(server: McpServer): void {
  registerSleepTools(server);
  registerDailyTools(server);
  registerVitalsTools(server);
  registerWorkoutTools(server);
  registerHeartrateTools(server);
  registerProfileTools(server);
}
