import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { exchangeToken, TOKENS_FILE } from './oura-tokens.js';

/**
 * The localhost OAuth consent flow for connecting an Oura account, shared by
 * scripts/get-token.ts (prints the URL) and the stdio entry's interactive auth
 * (opens the browser itself). One flow at a time: it owns a fixed local port.
 */

export const OAUTH_PORT = 8888;
export const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/callback`;
// stress -> daily_resilience; heart_health -> cardiovascular age, vO2 max;
// ring_configuration -> ring info and battery. Scope names confirmed via API 401 hints.
const SCOPES =
  'email personal daily heartrate workout tag session spo2 stress heart_health ring_configuration';

export function buildAuthorizeUrl(clientId: string, state: string): URL {
  const url = new URL('https://cloud.ouraring.com/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);
  return url;
}

export interface OAuthFlowOptions {
  /** Called once the callback listener is up, with the URL the user must open. */
  onReady?: (authorizeUrl: string) => void;
  /** Give up waiting for the consent callback after this long. Default 5 min. */
  timeoutMs?: number;
}

/**
 * Starts the callback listener and resolves once tokens are saved to
 * TOKENS_FILE. Rejects on timeout, port conflict, or a failed exchange.
 */
export function runOAuthFlow(
  clientId: string,
  clientSecret: string,
  options: OAuthFlowOptions = {},
): Promise<void> {
  const state = randomBytes(16).toString('hex');
  const authorizeUrl = buildAuthorizeUrl(clientId, state);

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', REDIRECT_URI);
      if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      if (!code || returnedState !== state) {
        res
          .writeHead(400, { 'Content-Type': 'text/plain' })
          .end('Bad callback: missing code or state mismatch.');
        finish(new Error('OAuth callback arrived without a code or with a wrong state.'));
        return;
      }
      try {
        await exchangeToken({
          grantType: 'authorization_code',
          clientId,
          clientSecret,
          code,
          redirectUri: REDIRECT_URI,
        });
        res
          .writeHead(200, { 'Content-Type': 'text/plain' })
          .end(`Done. Oura account connected (tokens in ${TOKENS_FILE}). You can close this tab.`);
        finish();
      } catch (err) {
        res
          .writeHead(500, { 'Content-Type': 'text/plain' })
          .end('Token exchange failed. See the server log.');
        finish(err instanceof Error ? err : new Error(String(err)));
      }
    });

    const timer = setTimeout(
      () => finish(new Error('Timed out waiting for the Oura consent callback.')),
      options.timeoutMs ?? 5 * 60_000,
    );

    function finish(err?: Error): void {
      clearTimeout(timer);
      server.close();
      if (err) reject(err);
      else resolve();
    }

    server.on('error', (err) => finish(err));
    server.listen(OAUTH_PORT, () => {
      options.onReady?.(authorizeUrl.toString());
    });
  });
}
