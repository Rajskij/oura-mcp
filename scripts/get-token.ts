/**
 * One-time local OAuth flow to obtain Oura tokens for a single account.
 * Usage: set OURA_CLIENT_ID / OURA_CLIENT_SECRET in .env, then `npm run get-token`,
 * then open the printed URL in a browser logged into the Oura account to connect.
 *
 * The redirect URI must be registered in the Oura app settings.
 */
import { loadEnv, requireEnv } from '../src/env.js';
import { REDIRECT_URI, runOAuthFlow } from '../src/providers/oura-oauth.js';
import { TOKENS_FILE } from '../src/providers/oura-tokens.js';

loadEnv();
const clientId = requireEnv('OURA_CLIENT_ID');
const clientSecret = requireEnv('OURA_CLIENT_SECRET');

try {
  await runOAuthFlow(clientId, clientSecret, {
    onReady: (authorizeUrl) => {
      console.log('1. Make sure this redirect URI is registered in the Oura app settings:');
      console.log(`   ${REDIRECT_URI}`);
      console.log('2. Open this URL in a browser logged into the Oura account to connect:');
      console.log(`   ${authorizeUrl}`);
      console.log('Waiting for the callback...');
    },
  });
  console.log(`Tokens saved to ${TOKENS_FILE}`);
} catch (err) {
  console.error(String(err));
  process.exit(1);
}
