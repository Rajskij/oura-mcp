import { config } from '../config.js';
import { exchangeToken, loadTokens } from './oura-tokens.js';

/** All Oura API access lives in this module (see CLAUDE.md). */

/**
 * Sandbox mode (OURA_SANDBOX=1): hits Oura's sandbox with fake data and a dummy
 * token. No real account or subscription needed — used for local smoke tests.
 * Note: the sandbox has no personal_info endpoint; tools handle that gracefully.
 */
const SANDBOX = process.env.OURA_SANDBOX === '1' || process.env.OURA_SANDBOX === 'true';

const OURA_API_BASE = SANDBOX
  ? 'https://api.ouraring.com/v2/sandbox'
  : 'https://api.ouraring.com/v2';

/** Refresh slightly before expiry so a request never rides an expiring token. */
const EXPIRY_MARGIN_MS = 60_000;

export class OuraApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'OuraApiError';
  }
}

/** Messages the client model can relay to the user as-is. */
const ERROR_HINTS: Record<number, string> = {
  401: 'The Oura token is invalid or revoked. The account needs to be reconnected (npm run get-token).',
  403: 'The Oura account has no active subscription, so the Oura API refuses data access.',
  429: 'Oura API rate limit hit. Wait a few minutes and try again.',
};

async function ensureAccessToken(): Promise<string> {
  if (SANDBOX) return 'sandbox';
  let tokens = loadTokens();
  if (Date.now() > tokens.expires_at - EXPIRY_MARGIN_MS) {
    tokens = await exchangeToken({
      grantType: 'refresh_token',
      clientId: config.oura.clientId,
      clientSecret: config.oura.clientSecret,
      refreshToken: tokens.refresh_token,
    });
  }
  return tokens.access_token;
}

export async function ouraGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const token = await ensureAccessToken();
  const url = new URL(`${OURA_API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const hint = ERROR_HINTS[res.status] ?? `Oura API returned ${res.status} for ${path}.`;
    throw new OuraApiError(res.status, hint);
  }
  return (await res.json()) as T;
}

interface Paged<T> {
  data: T[];
  next_token: string | null;
}

/** Fetch a collection endpoint following next_token pagination (capped). */
export async function ouraGetAll<T>(
  path: string,
  params: Record<string, string> = {},
  maxPages = 5,
): Promise<T[]> {
  const out: T[] = [];
  let nextToken: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const pageParams: Record<string, string> = nextToken
      ? { ...params, next_token: nextToken }
      : params;
    const res = await ouraGet<Paged<T>>(path, pageParams);
    out.push(...res.data);
    nextToken = res.next_token;
    if (!nextToken) break;
  }
  return out;
}
