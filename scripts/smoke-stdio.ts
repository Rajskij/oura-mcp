/**
 * Smoke test for the stdio entry and its demo fallback: starts the built
 * dist/src/stdio.js WITHOUT any Oura credentials (that is the point — the
 * server must fall back to sandbox mode, not crash) and drives the real MCP
 * handshake over stdio. Used by CI; run locally with:
 * npm run build && npm run smoke:stdio
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const EXPECTED_TOOLS = [
  'oura_get_sleep',
  'oura_get_sleep_detail',
  'oura_get_readiness',
  'oura_get_activity',
  'oura_get_stress',
  'oura_get_vitals',
  'oura_get_workouts',
  'oura_get_tags',
  'oura_get_heartrate',
  'oura_get_profile',
];

function fail(message: string): never {
  console.error(`SMOKE-STDIO FAIL: ${message}`);
  process.exit(1);
}

// Strip Oura variables from the child env so the fallback is what's under test,
// even on a machine whose shell exports real credentials.
const env: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined && !key.startsWith('OURA_') && key !== 'MCP_PATH_SECRET') {
    env[key] = value;
  }
}

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/src/stdio.js'],
  env,
});
const client = new Client({ name: 'smoke-stdio', version: '1.0.0' });

try {
  // 1. The handshake itself is the start-and-introspect check.
  await client.connect(transport);

  // 2. All tools are registered and read-only.
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name);
  for (const expected of EXPECTED_TOOLS) {
    if (!names.includes(expected)) fail(`tool missing from tools/list: ${expected}`);
  }
  const notReadOnly = tools.filter((t) => t.annotations?.readOnlyHint !== true);
  if (notReadOnly.length > 0) {
    fail(`tools without readOnlyHint: ${notReadOnly.map((t) => t.name).join(', ')}`);
  }

  // 3. A representative call returns sandbox data, proving the fallback engaged.
  const result = await client.callTool({ name: 'oura_get_sleep', arguments: {} });
  if (result.isError) fail('oura_get_sleep returned isError in sandbox demo mode');
  const content = result.content as Array<{ type: string; text?: string }>;
  const payload = JSON.parse(content[0]?.text ?? '{}');
  if (!Array.isArray(payload.days)) fail('oura_get_sleep payload has no days array');
  if (typeof payload.sandbox_note !== 'string') {
    fail('demo-mode response is missing the sandbox_note marker');
  }

  console.log(`SMOKE-STDIO OK: ${names.length} tools, sleep days=${payload.days.length}`);
  await client.close();
  process.exit(0);
} catch (err) {
  fail(String(err));
}
