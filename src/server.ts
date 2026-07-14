import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SANDBOX } from './providers/oura.js';
import { registerAllTools } from './tools/index.js';

/**
 * Server instructions ride the MCP initialize response, so the client model
 * gets them once per session — the right place for setup guidance that would
 * be noise if repeated in every tool response.
 */
const DEMO_INSTRUCTIONS = `This server is in DEMO MODE: no Oura account is connected, every number is a fake sample from Oura's public sandbox. Always make that clear when presenting data.
If the user wants their real data, walk them through this (takes ~5 minutes):
1. Create a personal (free, instant) Oura app at https://developer.ouraring.com/applications with redirect URI exactly http://localhost:8888/callback
2. In Claude Desktop: Settings -> Extensions -> oura-mcp -> Configure, paste the app's Client ID and Client Secret
3. Ask any health question again: a browser opens with the Oura consent page; after they approve, answers use their real data.`;

const REAL_INSTRUCTIONS = `Tools read the connected Oura account; everything is read-only. If a tool reports that no account is connected yet or that consent is pending, a browser window with the Oura consent page opens on the user's machine — tell them to approve it there and ask again.`;

/**
 * A fresh McpServer per request (stateless Streamable HTTP).
 * Phase 1: single hardcoded account, all tools are read-only.
 */
export function buildServer(): McpServer {
  const server = new McpServer(
    // Version is kept in sync with releases by release-please (extra-files).
    { name: 'oura-mcp', version: '0.2.1' }, // x-release-please-version
    { instructions: SANDBOX ? DEMO_INSTRUCTIONS : REAL_INSTRUCTIONS },
  );
  registerAllTools(server);
  return server;
}
