# Contributing

Glad you're here. This project is small on purpose, so getting into it takes minutes.

## Dev setup

You don't need an Oura Ring or account to develop: the sandbox mode serves Oura's fake data.

```bash
git clone https://github.com/Rajskij/oura-mcp.git
cd oura-mcp
npm install

# .env with any non-empty credentials works in sandbox mode
cp .env.example .env   # set MCP_PATH_SECRET to anything, e.g. "dev"

OURA_SANDBOX=1 npm run dev
```

Then talk to it like an MCP client would:

```bash
curl -s -X POST http://localhost:3000/mcp/dev \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Checks

CI runs exactly these, so run them before pushing:

```bash
npm run typecheck
npm run lint        # biome; `npm run lint:fix` auto-formats
npm run build && npm run smoke
```

## Pull requests

`main` is protected: every change goes through a PR with green CI, including from maintainers. Merging to `main` deploys and publishes a new Docker image, so PRs should be small and focused.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `ci:`.

## Design ground rules

- Every tool is read-only and sets `readOnlyHint: true`
- Tool responses stay compact: aggregate server-side, convert units, strip internal IDs and raw time series (see "Designed for LLMs" in the README)
- Never log tokens or secrets, including in tests and error messages
- All Oura API access goes through `src/providers/oura.ts`
