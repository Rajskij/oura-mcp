import { DurableObject } from 'cloudflare:workers';
import { StreamableHTTPTransport } from '@hono/mcp';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { EXPIRY_MARGIN_MS, OuraApiError, setAccessTokenProvider } from '../providers/oura.js';
import { buildAuthorizeUrl } from '../providers/oura-oauth.js';
import { type OuraTokens, requestToken } from '../providers/oura-tokens.js';
import { buildServer } from '../server.js';

/**
 * Cloudflare Workers entry: the same MCP server on the edge, for clients that
 * need a public HTTPS URL (ChatGPT, claude.ai web) without the user running a
 * VM. Each user deploys their own worker on their own Cloudflare account.
 *
 * Tokens live in a single Durable Object, not KV: Oura rotates the refresh
 * token on every use, and the DO's serialized execution makes the
 * two-refreshes-race (which would kill the token family) impossible.
 */

interface Env {
  OURA_TOKENS: {
    idFromName(name: string): unknown;
    get(id: unknown): {
      connect(tokens: OuraTokens): Promise<void>;
      getAccessToken(clientId: string, clientSecret: string): Promise<string>;
      setPendingState(state: string): Promise<void>;
      takePendingState(): Promise<string | undefined>;
    };
  };
  MCP_PATH_SECRET?: string;
  OURA_CLIENT_ID?: string;
  OURA_CLIENT_SECRET?: string;
  OURA_SANDBOX?: string;
}

export class OuraTokensDO extends DurableObject<Env> {
  async connect(tokens: OuraTokens): Promise<void> {
    await this.ctx.storage.put('tokens', tokens);
  }

  /** Check-expiry -> refresh -> persist, atomically (DO input gates). */
  async getAccessToken(clientId: string, clientSecret: string): Promise<string> {
    const tokens = await this.ctx.storage.get<OuraTokens>('tokens');
    if (!tokens) throw new Error('no_tokens');
    if (Date.now() <= tokens.expires_at - EXPIRY_MARGIN_MS) return tokens.access_token;
    const fresh = await requestToken({
      grantType: 'refresh_token',
      clientId,
      clientSecret,
      refreshToken: tokens.refresh_token,
    });
    await this.ctx.storage.put('tokens', fresh);
    return fresh.access_token;
  }

  /** One consent flow at a time; the state nonce lives here, not in a cookie. */
  async setPendingState(state: string): Promise<void> {
    await this.ctx.storage.put('pending_state', state);
  }

  async takePendingState(): Promise<string | undefined> {
    const state = await this.ctx.storage.get<string>('pending_state');
    await this.ctx.storage.delete('pending_state');
    return state;
  }
}

function tokensStub(env: Env) {
  return env.OURA_TOKENS.get(env.OURA_TOKENS.idFromName('singleton'));
}

/**
 * The value shipped as the deploy-dialog default (see .dev.vars.example). It
 * lets the demo work with zero setup, but is public — so it must never guard a
 * real account.
 */
const INSECURE_DEFAULT_SECRET = 'change-me-to-a-long-random-string';

function realCredentials(env: Env): boolean {
  const sandbox = env.OURA_SANDBOX === '1' || env.OURA_SANDBOX === 'true';
  return !sandbox && !!env.OURA_CLIENT_ID && !!env.OURA_CLIENT_SECRET;
}

function requireSecret(env: Env): string {
  const secret = env.MCP_PATH_SECRET;
  if (!secret) throw new HTTPException(500, { message: 'MCP_PATH_SECRET is not configured' });
  // Fine for the fake-data demo; refuse to expose a real account under a secret
  // that ships in the public repo.
  if (secret === INSECURE_DEFAULT_SECRET && realCredentials(env)) {
    throw new HTTPException(403, {
      message:
        'MCP_PATH_SECRET is still the shipped default. Set a long random value ' +
        '(openssl rand -hex 24) in the worker settings before connecting a real Oura account.',
    });
  }
  return secret;
}

const app = new Hono<{ Bindings: Env }>();

app.post('/mcp/:secret', async (c) => {
  if (c.req.param('secret') !== requireSecret(c.env)) return c.notFound();

  // The provider closes over this request's origin so the "not connected yet"
  // message can point at the exact consent URL for this deployment.
  const env = c.env;
  const origin = new URL(c.req.url).origin;
  setAccessTokenProvider(async () => {
    const { OURA_CLIENT_ID: id, OURA_CLIENT_SECRET: secret } = env;
    if (!id || !secret) {
      throw new OuraApiError(
        401,
        'OURA_CLIENT_ID / OURA_CLIENT_SECRET are not configured on this worker. ' +
          'Add them as secrets (wrangler secret put) or set OURA_SANDBOX=1 for demo data.',
      );
    }
    try {
      return await tokensStub(env).getAccessToken(id, secret);
    } catch (err) {
      if (String(err).includes('no_tokens')) {
        throw new OuraApiError(
          401,
          'No Oura account connected yet. Open this URL in a browser to connect: ' +
            `${origin}/oauth/start?key=<your MCP_PATH_SECRET> — then ask again.`,
        );
      }
      throw err;
    }
  });

  const server = buildServer();
  const transport = new StreamableHTTPTransport({ sessionIdGenerator: undefined });
  c.req.raw.signal.addEventListener('abort', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  return (await transport.handleRequest(c)) ?? c.body(null, 202);
});

app.on(['GET', 'DELETE'], '/mcp/:secret', (c) => {
  if (c.req.param('secret') !== requireSecret(c.env)) return c.notFound();
  return c.json(
    { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null },
    405,
  );
});

app.get('/oauth/start', async (c) => {
  if (c.req.query('key') !== requireSecret(c.env)) return c.notFound();
  const clientId = c.env.OURA_CLIENT_ID;
  if (!clientId) return c.text('OURA_CLIENT_ID is not configured on this worker.', 500);
  const state = crypto.randomUUID().replace(/-/g, '');
  await tokensStub(c.env).setPendingState(state);
  const redirectUri = `${new URL(c.req.url).origin}/oauth/callback`;
  return c.redirect(buildAuthorizeUrl(clientId, state, redirectUri).toString());
});

app.get('/oauth/callback', async (c) => {
  const code = c.req.query('code');
  const returnedState = c.req.query('state');
  const expectedState = await tokensStub(c.env).takePendingState();
  if (!code || !returnedState || returnedState !== expectedState) {
    return c.text('Bad callback: missing code or state mismatch. Restart from /oauth/start.', 400);
  }
  const { OURA_CLIENT_ID: clientId, OURA_CLIENT_SECRET: clientSecret } = c.env;
  if (!clientId || !clientSecret) return c.text('Worker credentials are not configured.', 500);
  const tokens = await requestToken({
    grantType: 'authorization_code',
    clientId,
    clientSecret,
    code,
    redirectUri: `${new URL(c.req.url).origin}/oauth/callback`,
  });
  await tokensStub(c.env).connect(tokens);
  return c.text('Oura account connected. You can close this tab and ask your assistant again.');
});

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error('Unhandled request error:', err);
  return c.json(
    { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null },
    500,
  );
});

app.get('/healthz', (c) => c.text('ok'));

export default app;
