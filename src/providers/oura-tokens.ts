import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Token storage and OAuth token exchange for Oura.
 * Deliberately has no dependency on config.ts so scripts/get-token.ts can use it
 * before the server env (MCP_PATH_SECRET etc.) is set up.
 */

const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';
const TOKENS_FILE = 'data/tokens.json';

export interface OuraTokens {
  access_token: string;
  refresh_token: string;
  /** Unix epoch ms when access_token expires. */
  expires_at: number;
}

export function saveTokens(tokens: OuraTokens): void {
  mkdirSync(dirname(TOKENS_FILE), { recursive: true });
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

export function loadTokens(): OuraTokens {
  if (!existsSync(TOKENS_FILE)) {
    throw new Error(`No Oura tokens at ${TOKENS_FILE}. Run: npm run get-token`);
  }
  return JSON.parse(readFileSync(TOKENS_FILE, 'utf8')) as OuraTokens;
}

export async function exchangeToken(params: {
  grantType: 'authorization_code' | 'refresh_token';
  clientId: string;
  clientSecret: string;
  code?: string;
  redirectUri?: string;
  refreshToken?: string;
}): Promise<OuraTokens> {
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
  const tokens: OuraTokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
  };
  saveTokens(tokens);
  return tokens;
}
