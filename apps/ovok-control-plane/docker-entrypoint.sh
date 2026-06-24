#!/bin/sh
set -e

export PORT="${PORT:-4001}"

DB_URL="${CONTROL_PLANE_DATABASE_URL:-${DATABASE_URL:-}}"

if [ -n "$DB_URL" ]; then
  echo "[ovok-control-plane] Running Drizzle migrations..."
  DRIZZLE_KIT_BIN="./node_modules/drizzle-kit/bin.cjs"
  if [ ! -f "$DRIZZLE_KIT_BIN" ]; then
    echo "[ovok-control-plane] drizzle-kit not found at $DRIZZLE_KIT_BIN — skipping migrations"
  else
    CONTROL_PLANE_DATABASE_URL="$DB_URL" node "$DRIZZLE_KIT_BIN" migrate
  fi
else
  echo "[ovok-control-plane] No CONTROL_PLANE_DATABASE_URL/DATABASE_URL — skipping migrations"
fi

echo "[ovok-control-plane] Starting server on port ${PORT}..."
exec node dist/index.js
