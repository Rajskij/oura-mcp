/**
 * Smoke test: boots the built server against the Oura sandbox (no real account
 * or secrets needed) and verifies the MCP surface actually answers.
 * Used by CI; run locally with: npm run build && npm run smoke
 */
import { type ChildProcess, spawn } from 'node:child_process';

const PORT = 3399;
const PATH_SECRET = 'smoke-test-path';
const BASE = `http://localhost:${PORT}`;
const MCP_URL = `${BASE}/mcp/${PATH_SECRET}`;

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

function fail(message: string, child?: ChildProcess): never {
  console.error(`SMOKE FAIL: ${message}`);
  child?.kill();
  process.exit(1);
}

/** Responses arrive as SSE ("event: message\ndata: {...}"); pull out the JSON. */
async function mcpCall(method: string, params: unknown): Promise<unknown> {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${method}`);
  const text = await res.text();
  const dataLine = text.split('\n').find((l) => l.startsWith('data: '));
  if (!dataLine) throw new Error(`No SSE data line in response for ${method}`);
  return JSON.parse(dataLine.slice('data: '.length));
}

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE}/healthz`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('server did not come up within 15s');
}

const child = spawn('node', ['dist/src/index.js'], {
  env: {
    ...process.env,
    OURA_SANDBOX: '1',
    PORT: String(PORT),
    MCP_PATH_SECRET: PATH_SECRET,
    // Required by config but unused in sandbox mode.
    OURA_CLIENT_ID: 'smoke',
    OURA_CLIENT_SECRET: 'smoke',
  },
  stdio: 'inherit',
});

try {
  await waitForServer();

  // 1. All tools are registered.
  const list = (await mcpCall('tools/list', {})) as {
    result?: { tools?: Array<{ name: string; annotations?: { readOnlyHint?: boolean } }> };
  };
  const tools = list.result?.tools ?? [];
  const names = tools.map((t) => t.name);
  for (const expected of EXPECTED_TOOLS) {
    if (!names.includes(expected)) fail(`tool missing from tools/list: ${expected}`, child);
  }
  const notReadOnly = tools.filter((t) => t.annotations?.readOnlyHint !== true);
  if (notReadOnly.length > 0) {
    fail(`tools without readOnlyHint: ${notReadOnly.map((t) => t.name).join(', ')}`, child);
  }

  // 2. A representative call returns data, not an error.
  const sleep = (await mcpCall('tools/call', { name: 'oura_get_sleep', arguments: {} })) as {
    result?: { isError?: boolean; content?: Array<{ text?: string }> };
  };
  if (sleep.result?.isError)
    fail(`oura_get_sleep returned isError: ${sleep.result.content?.[0]?.text}`, child);
  const payload = JSON.parse(sleep.result?.content?.[0]?.text ?? '{}');
  if (!Array.isArray(payload.days)) fail('oura_get_sleep payload has no days array', child);

  // 3. A composite tool survives partially missing endpoints (sandbox has no personal_info).
  const profile = (await mcpCall('tools/call', { name: 'oura_get_profile', arguments: {} })) as {
    result?: { isError?: boolean };
  };
  if (profile.result?.isError) fail('oura_get_profile returned isError', child);

  // 4. The wrong path stays hidden.
  const wrong = await fetch(`${BASE}/mcp/wrong-path`, { method: 'POST' });
  if (wrong.status !== 404) fail(`wrong path returned ${wrong.status}, expected 404`, child);

  // 5. Stateless mode rejects GET/DELETE with 405 instead of opening an SSE stream.
  for (const method of ['GET', 'DELETE'] as const) {
    const res = await fetch(MCP_URL, { method });
    if (res.status !== 405) fail(`${method} returned ${res.status}, expected 405`, child);
  }

  // 6. A notification-only POST (no id) is accepted with 202 and no body.
  const notify = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  });
  if (notify.status !== 202) fail(`notification returned ${notify.status}, expected 202`, child);

  console.log(`SMOKE OK: ${names.length} tools, sleep days=${payload.days.length}`);
  child.kill();
  process.exit(0);
} catch (err) {
  fail(String(err), child);
}
