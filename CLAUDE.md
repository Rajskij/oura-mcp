# CLAUDE.md

Remote MCP server that exposes Oura Ring data (sleep, readiness, activity, stress, heart rate) to MCP clients like ChatGPT and Claude. The client model does all interpretation and translation; this server only returns compact, well-shaped data.

If `CLAUDE.local.md` or `docs/ROADMAP.md` exist in your checkout (both are gitignored), read them first. They hold the current plan and private context.

## Current phase: 1 (single user)

One Oura account, no auth between the MCP client and this server (a long random URL path instead), deployed on an Oracle ARM VM. Do not build phase 2 features (multi-tenant, OAuth server, database, Next.js, webhooks) unless the phase is explicitly switched in the roadmap.

## Stack

- Node.js 22+, TypeScript strict, no `any`
- MCP: official `@modelcontextprotocol/sdk`, Streamable HTTP transport (not SSE, which is deprecated in the MCP spec)
- HTTP framework: Hono
- Phase 1 token storage: `data/tokens.json` (gitignored)
- Deploy target: Oracle Cloud free-tier VM (x86_64, Ubuntu 24.04, 1 GB RAM + 2 GB swap), Caddy for TLS, systemd
- Keep all Oura API code in `src/providers/oura.ts`. That module boundary is the only concession to a possible multi-provider future.

## Commands

- `npm run dev` — run locally with watch (tsx)
- `npm run typecheck` — TypeScript check, run after every change
- `npm run get-token` — one-time local OAuth flow, saves tokens to `data/tokens.json`
- `npm run build` / `npm start` — production build and run

## Rules

- Every tool is read-only and must set `readOnlyHint: true`. ChatGPT treats unannotated tools as writes and asks the user for confirmation on every call.
- Never log, commit, or paste Oura tokens or the OAuth client secret anywhere, including tests, fixtures, and examples.
- Keep tool results compact: aggregate server-side. ChatGPT caps tool results at 25k tokens. Heart rate and detailed sleep endpoints need a required date range plus downsampling.
- Tool names, parameters, and descriptions are written in English. The client model reads them, and English descriptions work for users in any language.
- Map Oura API errors to messages the model can relay: 401 means the token expired and needs a reconnect, 403 means no active Oura subscription, 429 means rate limited.
- Don't add features outside the current phase without being asked.
