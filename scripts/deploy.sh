#!/usr/bin/env bash
# Builds the server + client and pushes them to the Linode VPS, then
# restarts the nightfalls.service systemd unit. Run from the repo root
# (or anywhere — paths below are relative to this script's location).
#
# Requires: ~/.ssh/nightfalls_key already installed on the VPS as an
# authorized key for root (set up 2026-07-21/22).
#
# Known limitation: uses scp, not rsync --delete, so files removed
# locally aren't removed on the VPS. Fine for now; revisit if stale
# files on the server ever become a problem.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

VPS_HOST="root@74.207.234.155"
SSH_KEY="$HOME/.ssh/nightfalls_key"
REMOTE_DIR="/var/www/nightfalls"
WS_URL="wss://night-falls.xyz/ws"

ssh_vps() { ssh -i "$SSH_KEY" "$VPS_HOST" "$@"; }
scp_vps() { scp -i "$SSH_KEY" "$@"; }

echo "==> Building server (tsc)..."
(cd server && npm run build)

echo "==> Building client (WS_URL=$WS_URL)..."
WS_URL="$WS_URL" npm run build

echo "==> Ensuring remote directory exists..."
ssh_vps "mkdir -p $REMOTE_DIR"

echo "==> Uploading server dist/ and package.json..."
scp_vps -r server/dist "$VPS_HOST:$REMOTE_DIR/"
scp_vps server/package.json "$VPS_HOST:$REMOTE_DIR/"

echo "==> Uploading client public/..."
scp_vps -r public "$VPS_HOST:$REMOTE_DIR/"

echo "==> Installing server dependencies on VPS (native module, must build there)..."
ssh_vps "cd $REMOTE_DIR && npm install --omit=dev"

echo "==> Fixing ownership and restarting service..."
ssh_vps "chown -R nightfalls:nightfalls $REMOTE_DIR && systemctl restart nightfalls.service && sleep 1 && systemctl status nightfalls.service --no-pager -l"

echo "==> Deploy complete: https://night-falls.xyz"
