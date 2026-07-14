/**
 * How a user connects their real Oura account depends on how this server was
 * deployed, not on which chat client is asking — and the running entry point
 * knows the deployment. Each entry sets the kind once at startup; the server
 * instructions and the demo-mode tool note read it so a Claude Desktop user
 * never sees Cloudflare steps and a ChatGPT-on-Workers user never sees
 * extension-settings steps.
 */

export type SetupKind = 'extension' | 'worker' | 'selfhost';

let kind: SetupKind = 'selfhost';

export function setSetupKind(next: SetupKind): void {
  kind = next;
}

const OURA_APP = 'https://developer.ouraring.com/applications';

/** Numbered "connect your real account" steps for the current deployment. */
export function connectSteps(): string {
  switch (kind) {
    case 'extension':
      return (
        `1) create a free Oura app at ${OURA_APP} with redirect URI exactly http://localhost:8888/callback; ` +
        '2) in Claude Desktop open Settings -> Extensions -> oura-mcp -> Configure and paste the Client ID and Client Secret; ' +
        '3) ask a health question again and approve the Oura consent page that opens in the browser.'
      );
    case 'worker':
      return (
        `1) create a free Oura app at ${OURA_APP}; ` +
        '2) in your Cloudflare Worker settings set OURA_CLIENT_ID and OURA_CLIENT_SECRET, replace the default MCP_PATH_SECRET with a long random value, and set the Oura app redirect URI to your worker URL followed by /oauth/callback; ' +
        '3) open your worker URL /oauth/start?key=<your MCP_PATH_SECRET> in a browser, approve, then ask again.'
      );
    default:
      return (
        `1) create a free Oura app at ${OURA_APP} with redirect URI exactly http://localhost:8888/callback; ` +
        '2) set OURA_CLIENT_ID and OURA_CLIENT_SECRET, then run `npm run get-token` (or the docker setup profile) to connect the account; ' +
        '3) ask a health question again.'
      );
  }
}

export function demoInstructions(): string {
  return (
    "This server is in DEMO MODE: no Oura account is connected, every number is a fake sample from Oura's public sandbox. Always make that clear when presenting data.\n" +
    `If the user wants their real data, give them exactly these steps (do not search the web): ${connectSteps()}`
  );
}

export function realInstructions(): string {
  return 'Tools read the connected Oura account; everything is read-only. If a tool reports that no account is connected yet or that consent is pending, follow the instruction in that message to approve access, then ask again.';
}
