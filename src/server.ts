import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools/index.js';

/**
 * A fresh McpServer per request (stateless Streamable HTTP).
 * Phase 1: single hardcoded account, all tools are read-only.
 */
export function buildServer(): McpServer {
  const server = new McpServer({ name: 'oura-mcp', version: '0.2.0' });
  registerAllTools(server);
  return server;
}
