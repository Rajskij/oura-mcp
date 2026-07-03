#!/bin/bash
# Fetches app secrets from OCI Vault into /run (tmpfs) at service start.
# Auth: instance principal — the VM itself is the identity, no keys on disk.
# VAULT_OCID is substituted by bootstrap.sh.
set -euo pipefail
VAULT=${VAULT_OCID}
OUT=/run/oura-mcp/env
umask 077

fetch() {
  OCI_CLI_AUTH=instance_principal /opt/oci-cli/bin/oci secrets secret-bundle get-secret-bundle-by-name \
    --secret-name "$1" --vault-id "$VAULT" \
    --query 'data."secret-bundle-content".content' --raw-output | base64 -d
}

{
  echo "OURA_CLIENT_ID=$(fetch OURA_CLIENT_ID)"
  echo "OURA_CLIENT_SECRET=$(fetch OURA_CLIENT_SECRET)"
  echo "MCP_PATH_SECRET=$(fetch MCP_PATH_SECRET)"
  echo "PORT=${PORT}"
} > "$OUT"
