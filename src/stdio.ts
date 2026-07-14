#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Local entry: an MCP client (Claude Desktop, an inspector) starts this process
 * itself and speaks the protocol over stdin/stdout. stdout belongs to the
 * protocol, so every log line here goes to stderr.
 *
 * The demo fallback lives ONLY in this entry: with no Oura credentials the
 * server runs against Oura's sandbox (fake data) instead of failing, so anyone
 * can try the tools before registering an Oura app. The HTTP entry keeps its
 * fail-fast boot on purpose — in production a broken secrets pipeline must
 * crash loudly, not silently serve fake data.
 */
// An empty or unsubstituted ${user_config.*} template (extension host quirks)
// must mean "no credentials", not a garbage client id.
for (const key of ['OURA_CLIENT_ID', 'OURA_CLIENT_SECRET']) {
  if (process.env[key]?.startsWith('${')) delete process.env[key];
}

if (!process.env.OURA_CLIENT_ID || !process.env.OURA_CLIENT_SECRET) {
  process.env.OURA_SANDBOX = '1';
  console.error(
    '[oura-mcp] No Oura credentials found — running in sandbox demo mode (fake data). ' +
      'Set OURA_CLIENT_ID and OURA_CLIENT_SECRET to use a real account.',
  );
} else if (!process.env.OURA_SANDBOX) {
  // A human is on the other side of a stdio client, so if no account is
  // connected yet the provider may open a browser for the Oura consent.
  process.env.OURA_INTERACTIVE_AUTH = '1';
}

// Dynamic import so the sandbox decision above is visible to the Oura provider,
// which reads OURA_SANDBOX once at module load.
const { buildServer } = await import('./server.js');

const server = buildServer();
await server.connect(new StdioServerTransport());
console.error('[oura-mcp] stdio server ready');
