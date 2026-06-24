#!/bin/sh
set -e

export PORT="${PORT:-4001}"

DB_URL="${CONTROL_PLANE_DATABASE_URL:-${DATABASE_URL:-}}"

if [ -n "$DB_URL" ]; then
  echo "[ovok-control-plane] Running Drizzle migrations..."
  CONTROL_PLANE_DATABASE_URL="$DB_URL" pnpm exec drizzle-kit migrate
else
  echo "[ovok-control-plane] No CONTROL_PLANE_DATABASE_URL/DATABASE_URL — skipping migrations"
fi

echo "[ovok-control-plane] Starting server on port ${PORT}..."
exec node dist/index.js
