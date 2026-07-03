/**
 * One-time local OAuth flow to obtain Oura tokens for a single account.
 * Usage: set OURA_CLIENT_ID / OURA_CLIENT_SECRET in .env, then `npm run get-token`,
 * then open the printed URL in a browser logged into the Oura account to connect.
 *
 * The redirect URI below must be registered in the Oura app settings.
 */
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { loadEnv, requireEnv } from '../src/env.js';
import { exchangeToken } from '../src/providers/oura-tokens.js';

loadEnv();
const clientId = requireEnv('OURA_CLIENT_ID');
const clientSecret = requireEnv('OURA_CLIENT_SECRET');

const PORT = 8888;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
// stress -> daily_resilience; heart_health -> cardiovascular age, vO2 max;
// ring_configuration -> ring info and battery. Scope names confirmed via API 401 hints.
const SCOPES =
  'email personal daily heartrate workout tag session spo2 stress heart_health ring_configuration';
const state = randomBytes(16).toString('hex');

const authorizeUrl = new URL('https://cloud.ouraring.com/oauth/authorize');
authorizeUrl.searchParams.set('response_type', 'code');
authorizeUrl.searchParams.set('client_id', clientId);
authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authorizeUrl.searchParams.set('scope', SCOPES);
authorizeUrl.searchParams.set('state', state);

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
      .end('Bad callback: missing code or state mismatch. Check the terminal.');
    console.error('Callback arrived without a code or with a wrong state.');
    server.close();
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
      .end('Done. Tokens saved to data/tokens.json. You can close this tab.');
    console.log('Tokens saved to data/tokens.json');
  } catch (err) {
    res
      .writeHead(500, { 'Content-Type': 'text/plain' })
      .end('Token exchange failed. Check the terminal.');
    console.error(err);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log('1. Make sure this redirect URI is registered in the Oura app settings:');
  console.log(`   ${REDIRECT_URI}`);
  console.log('2. Open this URL in a browser logged into the Oura account to connect:');
  console.log(`   ${authorizeUrl.toString()}`);
  console.log('Waiting for the callback...');
});
