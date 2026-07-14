import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * Token storage and OAuth token exchange for Oura.
 * Deliberately has no dependency on config.ts so scripts/get-token.ts can use it
 * before the server env (MCP_PATH_SECRET etc.) is set up.
 */

const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';

/**
 * Where the token file lives, in priority order:
 * 1. OURA_TOKENS_FILE env — explicit override;
 * 2. data/tokens.json — when a data/ directory exists next to the process
 *    (the VM and the docker volume both work this way);
 * 3. ~/.oura-mcp/tokens.json — local runs with no fixed working directory
 *    (Claude Desktop starts the stdio entry from an arbitrary cwd).
 */
export function resolveTokensFile(
  env: NodeJS.ProcessEnv,
  dataDirExists: boolean,
  home: string,
): string {
  if (env.OURA_TOKENS_FILE) return env.OURA_TOKENS_FILE;
  if (dataDirExists) return 'data/tokens.json';
  return join(home, '.oura-mcp', 'tokens.json');
}

export const TOKENS_FILE = resolveTokensFile(process.env, existsSync('data'), homedir());

export interface OuraTokens {
  access_token: string;
  refresh_token: string;
  /** Unix epoch ms when access_token expires. */
  expires_at: number;
}

export function saveTokens(tokens: OuraTokens): void {
  mkdirSync(dirname(TOKENS_FILE), { recursive: true });
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  // writeFileSync applies mode only on creation; enforce it for pre-existing files.
  chmodSync(TOKENS_FILE, 0o600);
}

export function loadTokens(): OuraTokens {
  if (!existsSync(TOKENS_FILE)) {
    throw new Error(`No Oura tokens at ${TOKENS_FILE}. Run: npm run get-token`);
  }
  return JSON.parse(readFileSync(TOKENS_FILE, 'utf8')) as OuraTokens;
}

export interface TokenRequest {
  grantType: 'authorization_code' | 'refresh_token';
  clientId: string;
  clientSecret: string;
  code?: string;
  redirectUri?: string;
  refreshToken?: string;
}

/** Exchange a code / refresh token at Oura. Pure: no storage side effects. */
export async function requestToken(params: TokenRequest): Promise<OuraTokens> {
  const body = new URLSearchParams({
    grant_type: params.grantType,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  if (params.code) body.set('code', params.code);
  if (params.redirectUri) body.set('redirect_uri', params.redirectUri);
  if (params.refreshToken) body.set('refresh_token', params.refreshToken);

  const res = await fetch(OURA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    // Error bodies here are OAuth error codes (e.g. invalid_grant), never tokens.
    throw new Error(`Oura token endpoint returned ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
  };
}

/** requestToken + persist to the local token file (the Node/file-based flows). */
export async function exchangeToken(params: TokenRequest): Promise<OuraTokens> {
  const tokens = await requestToken(params);
  saveTokens(tokens);
  return tokens;
}
