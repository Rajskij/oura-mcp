import { StreamableHTTPTransport } from '@hono/mcp';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { assertConfig, config } from './config.js';
import { buildServer } from './server.js';

// Safety net for a client that disconnects mid-response: a deferred stream write
// can land after the response controller is already closed, surfacing as an
// uncaught ERR_INVALID_STATE thrown from a timer with no handler frame on the
// stack (so a try/catch around the request cannot catch it). Swallow only that
// exact case; rethrow everything else so real faults still crash the process.
process.on('uncaughtException', (err) => {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === 'ERR_INVALID_STATE' && /Controller is already closed/.test(err.message)) {
    console.warn('[mcp] ignored post-close stream write:', err.message);
    return;
  }
  throw err;
});

assertConfig();

const app = new Hono();
const mcpPath = `/mcp/${config.mcpPathSecret}`;

// Stateless Streamable HTTP: a fresh server + transport per POST, no sessions.
app.post(mcpPath, async (c) => {
  const server = buildServer();
  const transport = new StreamableHTTPTransport({ sessionIdGenerator: undefined });
  // Free the per-request server/transport if the client disconnects mid-call.
  // On normal completion the transport aborts its own SSE stream and the
  // request-scoped server (which holds no long-lived resources) is GC'd, so
  // this listener only fires on the abort path.
  c.req.raw.signal.addEventListener('abort', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  // For POST, handleRequest always returns a Response (202 for notification-only
  // bodies, SSE otherwise); the `?? 202` only satisfies its Response|undefined type.
  return (await transport.handleRequest(c)) ?? c.body(null, 202);
});

app.onError((err, c) => {
  // The transport signals protocol errors (bad Accept/Content-Type, unparseable
  // body) by throwing HTTPException with the correct 4xx status and a JSON-RPC
  // body — return that as-is instead of masking every failure as a 500.
  if (err instanceof HTTPException) return err.getResponse();
  console.error('Unhandled request error:', err);
  return c.json(
    { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null },
    500,
  );
});

// Stateless mode has no sessions to resume or terminate: reject GET/DELETE
// explicitly instead of letting the transport open an SSE stream on GET.
app.get(mcpPath, (c) =>
  c.json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null }, 405),
);
app.delete(mcpPath, (c) =>
  c.json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null }, 405),
);

app.get('/healthz', (c) => c.text('ok'));

serve({ fetch: app.fetch, port: config.port }, (info) => {
  // The secret path is not logged on purpose.
  console.log(`oura-mcp listening on :${info.port}`);
});
