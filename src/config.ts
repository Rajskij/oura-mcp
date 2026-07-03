import { loadEnv, requireEnv } from './env.js';

loadEnv();

/**
 * Values are validated lazily on first access, so importing any module (e.g.
 * from unit tests) has no side effects and needs no environment. The server
 * still fails fast at boot: index.ts calls assertConfig() before serving.
 */
export const config = {
  get port(): number {
    return Number(process.env.PORT ?? 3000);
  },
  /** Long random URL path segment — the only access control in phase 1. */
  get mcpPathSecret(): string {
    return requireEnv('MCP_PATH_SECRET');
  },
  oura: {
    get clientId(): string {
      return requireEnv('OURA_CLIENT_ID');
    },
    get clientSecret(): string {
      return requireEnv('OURA_CLIENT_SECRET');
    },
  },
};

/** Touch every required value so a misconfigured server dies at boot, not mid-request. */
export function assertConfig(): void {
  config.port;
  config.mcpPathSecret;
  config.oura.clientId;
  config.oura.clientSecret;
}
