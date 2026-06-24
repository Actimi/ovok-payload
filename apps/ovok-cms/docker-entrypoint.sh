#!/bin/sh
set -e

export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"

if [ -n "${DATABASE_URI:-${DATABASE_URL:-}}" ]; then
  if [ -f "./node_modules/payload/bin.js" ]; then
    echo "[ovok-cms] Running Payload migrations..."
    PAYLOAD_MIGRATING=true NODE_ENV=production \
      node ./node_modules/payload/bin.js migrate \
      || echo "[ovok-cms] payload migrate exited non-zero; prodMigrations will retry on connect"
  else
    echo "[ovok-cms] payload CLI not found in standalone bundle; relying on prodMigrations at connect"
  fi
else
  echo "[ovok-cms] No DATABASE_URI/DATABASE_URL — skipping migrations"
fi

echo "[ovok-cms] Starting server on port ${PORT}..."
exec node server.js
