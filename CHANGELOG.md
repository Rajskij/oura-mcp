# Changelog

## [0.2.2](https://github.com/Rajskij/oura-mcp/compare/v0.2.1...v0.2.2) (2026-07-14)


### Features

* Claude Desktop extension (.mcpb) built and attached on release ([#41](https://github.com/Rajskij/oura-mcp/issues/41)) ([7ff7d61](https://github.com/Rajskij/oura-mcp/commit/7ff7d61dd7889a66850ea489d0c853a5d93619a3))
* portable token storage and in-client Oura consent ([#39](https://github.com/Rajskij/oura-mcp/issues/39)) ([51e5a84](https://github.com/Rajskij/oura-mcp/commit/51e5a84f601d93f3e248d532e9992ae79184b65f))


### CI/CD

* exclude manifest.json from biome checks ([#42](https://github.com/Rajskij/oura-mcp/issues/42)) ([cb8b34c](https://github.com/Rajskij/oura-mcp/commit/cb8b34c293b4b0ef31c84e3cfa6741eed310ac72))

## [0.2.1](https://github.com/Rajskij/oura-mcp/compare/v0.2.0...v0.2.1) (2026-07-13)


### Features

* local stdio entry with sandbox demo fallback ([d83a2c8](https://github.com/Rajskij/oura-mcp/commit/d83a2c831b5f880944e4d3812170f9dce194cf53))
* local stdio entry with sandbox demo fallback ([224cbcc](https://github.com/Rajskij/oura-mcp/commit/224cbcc5dacfc574b14c6f28f27dab20d5cd5f0b))


### Bug Fixes

* **ci:** anchor release-please after the v0.2.0 release ([a95367b](https://github.com/Rajskij/oura-mcp/commit/a95367b2e934e84a793182d06367c62ece4f37cc))
* **ci:** anchor release-please after the v0.2.0 release ([3eab327](https://github.com/Rajskij/oura-mcp/commit/3eab327c1b8d5b2ad8f1823a8c80e59b786834a1))

## 0.2.0 (2026-07-06)


### chore

* start versioned releases at 0.2.0 ([702547e](https://github.com/Rajskij/oura-mcp/commit/702547e986f97d42f65d9edf016297948a3c6948))


### Features

* deploy templates and idempotent bootstrap for a bare vm ([9674ddd](https://github.com/Rajskij/oura-mcp/commit/9674ddd1863d20dbabeea575490cb89cc2894198))
* docker image, compose and ghcr publishing ([a55ea20](https://github.com/Rajskij/oura-mcp/commit/a55ea20e3f35665489737013ad19a601a920562b))
* mcp server with 10 task-oriented oura tools and usage logging ([d5dc608](https://github.com/Rajskij/oura-mcp/commit/d5dc608671617c90e4a31c8a44d4a6a211d23b4b))
* oura oauth provider, token store and one-time consent script ([9a31da3](https://github.com/Rajskij/oura-mcp/commit/9a31da38e525cebc3e9733b0bc35360d6cc69b9c))


### Bug Fixes

* docker build broken by tsconfig split ([d191e6f](https://github.com/Rajskij/oura-mcp/commit/d191e6f11d2ada256cc2a469ff11eb3261f2965e))
* replace fetch-to-node bridge with @hono/mcp transport ([4a9ea90](https://github.com/Rajskij/oura-mcp/commit/4a9ea904a205b4b9fabc581ad89fc5a6fda630d8))
* replace fetch-to-node bridge with @hono/mcp transport ([a0b32e4](https://github.com/Rajskij/oura-mcp/commit/a0b32e4c3013aa2766395abcb8ae949122078500))
* ship tsconfig.build.json in docker context, build image on pr checks ([3a7b46f](https://github.com/Rajskij/oura-mcp/commit/3a7b46ff5055fba2112bf93bdb192a1f3d50a9e6))
* validate config at boot instead of import time ([138866f](https://github.com/Rajskij/oura-mcp/commit/138866f7a1f69c5d262e35847f53a97a5e79d8d4))


### Documentation

* add ARCHITECTURE.md, switch project to phase 2 (showcase) ([4d658be](https://github.com/Rajskij/oura-mcp/commit/4d658be27b5db4be2bccceeb2419a93aef4e3b47))
* add ARCHITECTURE.md, switch project to phase 2 (showcase) ([ac50c93](https://github.com/Rajskij/oura-mcp/commit/ac50c930fca6a26cc6224e7b92b4801b7361a8db))
* badges, security policy, contributing guide and issue templates ([c4d4b63](https://github.com/Rajskij/oura-mcp/commit/c4d4b6332a48f0d32738a1d0876fd43bda658a66))
* readme and claude code instructions ([9091b2a](https://github.com/Rajskij/oura-mcp/commit/9091b2a72e575ff185b4afa00404b841c8658def))
* repo hygiene ([c41c8ea](https://github.com/Rajskij/oura-mcp/commit/c41c8ead356b414ccf2e7515e7b51a2698a4c77e))
* rework README along MCP ecosystem best practices ([32faaeb](https://github.com/Rajskij/oura-mcp/commit/32faaeb9455cb89257a5b4073ab1adcc74dcad6e))
* rework README along MCP ecosystem best practices ([2ed5700](https://github.com/Rajskij/oura-mcp/commit/2ed57002795fec653e0f3c979416678d9f40f2f2))


### CI/CD

* add lint, audit and sandbox smoke pipeline ([edefb39](https://github.com/Rajskij/oura-mcp/commit/edefb39f697edc8a032ba79ef1a289a193094081))
* auto-merge dependabot minor and patch updates ([fa77b2a](https://github.com/Rajskij/oura-mcp/commit/fa77b2a5fdbd1dbda301e8f2c5cf27a83fb5b50e))
* auto-merge dependabot minor and patch updates ([7c275e6](https://github.com/Rajskij/oura-mcp/commit/7c275e6e3e70d3760d535c4a71830aa5a7e6c766))
* automate releases with release-please ([8587f7b](https://github.com/Rajskij/oura-mcp/commit/8587f7b7a7615c89ea72802e11712eb428e97748))
* automate releases with release-please ([d022956](https://github.com/Rajskij/oura-mcp/commit/d0229562747818878976caedae1b5518c8fb856e))
* bump actions to node 24 runtimes ([3452849](https://github.com/Rajskij/oura-mcp/commit/3452849cc785f36d09a6caa35f68db72960ff0c7))
* deploy the Caddy config and redact the secret path from its logs ([317559b](https://github.com/Rajskij/oura-mcp/commit/317559b280a4a47bd9af746e4601d3b469068118))
* deploy the Caddy config and redact the secret path from its logs ([ee82c90](https://github.com/Rajskij/oura-mcp/commit/ee82c90c5f1a0d293179f4f4a2bcf9634914d89b))
* deploy to production box on push to main ([b6f1724](https://github.com/Rajskij/oura-mcp/commit/b6f1724d38a37d7fe0a61dafa3e0361030043ec4))
* exclude the release-please manifest from biome checks ([efe11f5](https://github.com/Rajskij/oura-mcp/commit/efe11f5d6e3079c434b1b81af9f83c97463b8341))
* exclude the release-please manifest from biome checks ([5ddb555](https://github.com/Rajskij/oura-mcp/commit/5ddb555bf06eeb239095ed5af44996c41e7cda9e))
* uptime check every 15 minutes with auto-filed incident issue ([da2f86f](https://github.com/Rajskij/oura-mcp/commit/da2f86f7c26a7a7a65190febdb30b7768d11897a))
