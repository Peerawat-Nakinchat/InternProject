#!/bin/sh
set -e

APP_DIR=/usr/src/app
ENV_FILE="$APP_DIR/.env"
EXAMPLE_FILE="$APP_DIR/.env.supabase.example"

echo "[entrypoint] checking .env..."

if [ ! -f "$ENV_FILE" ] || [ ! -s "$ENV_FILE" ]; then
  if [ -f "$EXAMPLE_FILE" ]; then
    echo "[entrypoint] creating .env from .env.supabase.example"
    cp "$EXAMPLE_FILE" "$ENV_FILE"
  else
    echo "[entrypoint] no .env or example found: creating empty .env"
    touch "$ENV_FILE"
  fi
else
  echo "[entrypoint] .env exists, leaving as-is"
fi

# Optional: If Vault variables are provided, user can set VAULT_SECRET_PATH to fetch a secret
if [ -n "$VAULT_ADDR" ] && [ -n "$VAULT_TOKEN" ] && [ -n "$VAULT_SECRET_PATH" ]; then
  echo "[entrypoint] VAULT vars detected. Attempting to fetch $VAULT_SECRET_PATH"
  # Note: keep this minimal and non-destructive. We don't attempt complex parsing here.
  # This will append the raw JSON response to a temp file for manual inspection if needed.
  curl -sS -H "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR/v1/$VAULT_SECRET_PATH" > /tmp/vault_response.json || true
  if [ -s /tmp/vault_response.json ]; then
    echo "[entrypoint] vault response received; please extract needed values into $ENV_FILE manually or extend this script to parse them."
  else
    echo "[entrypoint] vault fetch failed or returned empty response"
  fi
fi

# Make sure script is executable
chmod +x "$APP_DIR/docker-entrypoint.sh" 2>/dev/null || true

# Exec the command passed to the container (defaults to CMD in Dockerfile)
exec "$@"
