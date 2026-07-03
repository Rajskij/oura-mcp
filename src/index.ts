import { serve } from '@hono/node-server';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { toFetchResponse, toReqRes } from 'fetch-to-node';
import { Hono } from 'hono';
import { config } from './config.js';
import { buildServer } from './server.js';

const app = new Hono();
const mcpPath = `/mcp/${config.mcpPathSecret}`;

// Stateless Streamable HTTP: a fresh server + transport per POST, no sessions.
app.post(mcpPath, async (c) => {
  // The raw body stream must have exactly one reader: the transport parses it
  // from the converted Node request, so nothing else may touch c.req here.
  const { req, res } = toReqRes(c.req.raw);
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
  return toFetchResponse(res);
});

app.onError((err, c) => {
  console.error('Unhandled request error:', err);
  return c.json(
    { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null },
    500,
  );
});

// No sessions to resume or terminate in stateless mode.
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
