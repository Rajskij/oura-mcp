# Deploying to a bare VM

This folder is the production box as code: everything the systemd deployment needs, extracted from the live setup. Docker users don't need any of this (see the main README).

Tested on Ubuntu 24.04 (an Oracle Cloud free-tier micro instance). Assumes a domain already points at the VM.

## Layout

| File | Purpose |
|---|---|
| `bootstrap.sh` | Idempotent server prep: swap, firewall, Node 22, Caddy, systemd units |
| `box.env.example` | Deployment parameters (domain, app dir, optional OCI vault) |
| `oura-mcp.service` | systemd unit template |
| `vault.conf` | systemd override: fetch secrets from OCI Vault into tmpfs at start |
| `oura-mcp-secrets.sh` | The fetch script `vault.conf` calls (instance principal auth) |
| `Caddyfile` | Reverse proxy with automatic TLS; owned by the CI deploy job (see below) |

## Usage

```bash
# on the VM
git clone https://github.com/Rajskij/oura-mcp.git && cd oura-mcp/deploy
cp box.env.example box.env   # edit values
sudo ./bootstrap.sh
```

Then get the app code onto the box: either set up the GitHub Actions deploy job (see `.github/workflows/ci.yml`, needs a deploy SSH key in repo secrets), or rsync a built artifact by hand.

The CI deploy job also owns the live `/etc/caddy/Caddyfile`: each deploy re-renders this `Caddyfile` template (`DOMAIN`/`PORT` come from the job env, keep them matching `box.env`), validates it on the box, and reloads Caddy only if it changed — restoring the previous config if the reload or the health check fails. Edit `Caddyfile` here and merge; do not hand-edit it on the box, or the next deploy overwrites the change.

## Secrets: two options

1. **Plain `.env`** in the app dir (chmod 600). Simple, fine for most self-hosters. Skip `vault.conf`.
2. **OCI Vault** (what production uses): secrets live in a vault, the VM reads them at service start via instance principal, nothing secret sits on disk. Requires a vault with secrets named `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`, `MCP_PATH_SECRET`, plus a dynamic group for the instance and a read policy scoped to the vault. Set `VAULT_OCID` in `box.env` and bootstrap wires it up.

## The one systemd gotcha

`EnvironmentFile` must be prefixed with `-` (`EnvironmentFile=-/run/oura-mcp/env`): systemd checks the file before running `ExecStartPre`, which is the very thing that creates it. Without the dash the service never starts. Already handled in `vault.conf`.
