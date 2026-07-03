#!/bin/bash
# Idempotent server prep for oura-mcp on Ubuntu 24.04. Run as root: sudo ./bootstrap.sh
# Extracted from the production box setup; safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"

[ -f box.env ] || { echo "Copy box.env.example to box.env and edit it first."; exit 1; }
# shellcheck disable=SC1091
source box.env
export DOMAIN APP_DIR APP_USER PORT VAULT_OCID

echo "== swap (2G, protects 1GB boxes from OOM during installs)"
if ! swapon --show | grep -q swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

echo "== firewall: open 80/443 (Oracle images REJECT by default)"
if ! iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null; then
  N=$(iptables -L INPUT --line-numbers | grep -m1 REJECT | awk '{print $1}')
  iptables -I INPUT "${N:-1}" -p tcp --dport 80 -j ACCEPT
  iptables -I INPUT "${N:-1}" -p tcp --dport 443 -j ACCEPT
  command -v netfilter-persistent > /dev/null && netfilter-persistent save
fi

echo "== node 22"
if ! command -v node > /dev/null || [ "$(node -e 'console.log(process.versions.node.split(".")[0])')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "== caddy"
if ! command -v caddy > /dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

echo "== app dir and caddy config"
mkdir -p "$APP_DIR/data" && chown -R "$APP_USER:$APP_USER" "$APP_DIR"
envsubst '${DOMAIN} ${PORT}' < Caddyfile > /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy

echo "== systemd unit"
envsubst '${APP_USER} ${APP_DIR}' < oura-mcp.service > /etc/systemd/system/oura-mcp.service

if [ -n "${VAULT_OCID:-}" ]; then
  echo "== OCI Vault secret fetching (instance principal)"
  if [ ! -x /opt/oci-cli/bin/oci ]; then
    apt-get install -y python3-venv
    python3 -m venv /opt/oci-cli
    /opt/oci-cli/bin/pip install -q --upgrade pip oci-cli
  fi
  envsubst '${VAULT_OCID} ${PORT}' < oura-mcp-secrets.sh > /usr/local/bin/oura-mcp-secrets
  chmod 755 /usr/local/bin/oura-mcp-secrets
  mkdir -p /etc/systemd/system/oura-mcp.service.d
  cp vault.conf /etc/systemd/system/oura-mcp.service.d/vault.conf
else
  echo "== plain .env mode: put your .env into $APP_DIR (chmod 600), no vault override"
  rm -f /etc/systemd/system/oura-mcp.service.d/vault.conf
fi

systemctl daemon-reload
systemctl enable oura-mcp > /dev/null

echo
echo "Bootstrap done. Next:"
echo "  1. Get the built app into $APP_DIR (CI deploy job or rsync of dist/ + node_modules/)"
echo "  2. Connect an Oura account (tokens into $APP_DIR/data/tokens.json)"
echo "  3. systemctl start oura-mcp && curl -s https://$DOMAIN/healthz"
