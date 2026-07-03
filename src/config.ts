import { loadEnv, requireEnv } from './env.js';

loadEnv();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  /** Long random URL path segment — the only access control in phase 1. */
  mcpPathSecret: requireEnv('MCP_PATH_SECRET'),
  oura: {
    clientId: requireEnv('OURA_CLIENT_ID'),
    clientSecret: requireEnv('OURA_CLIENT_SECRET'),
  },
} as const;
