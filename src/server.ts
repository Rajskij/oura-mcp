import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools/index.js';

/**
 * A fresh McpServer per request (stateless Streamable HTTP).
 * Phase 1: single hardcoded account, all tools are read-only.
 */
export function buildServer(): McpServer {
  // Version is kept in sync with releases by release-please (extra-files).
  const server = new McpServer({ name: 'oura-mcp', version: '0.2.0' }); // x-release-please-version
  registerAllTools(server);
  return server;
}
