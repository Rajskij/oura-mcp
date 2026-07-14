import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isSandbox } from './providers/oura.js';
import { demoInstructions, realInstructions } from './setup-guide.js';
import { registerAllTools } from './tools/index.js';

/**
 * A fresh McpServer per request (stateless Streamable HTTP).
 * Phase 1: single hardcoded account, all tools are read-only.
 *
 * Server instructions ride the MCP initialize response, so the client model
 * gets them once per session — the right place for setup guidance that would
 * be noise in every tool response. The connect steps are deployment-specific
 * (see setup-guide.ts).
 */
export function buildServer(): McpServer {
  const server = new McpServer(
    // Version is kept in sync with releases by release-please (extra-files).
    { name: 'oura-mcp', version: '0.2.2' }, // x-release-please-version
    { instructions: isSandbox() ? demoInstructions() : realInstructions() },
  );
  registerAllTools(server);
  return server;
}
