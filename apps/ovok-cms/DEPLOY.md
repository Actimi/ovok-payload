# Deploying to Railway

Both Ovok apps deploy from the **monorepo root** (required for `@ovok/contracts`).

## 1. Create two Railway services

| Service              | Dockerfile                           | Health check            |
| -------------------- | ------------------------------------ | ----------------------- |
| `ovok-cms`           | `apps/ovok-cms/Dockerfile`           | `GET /api/_ovok/health` |
| `ovok-control-plane` | `apps/ovok-control-plane/Dockerfile` | `GET /health`           |

For each service in Railway:

- **Root Directory:** `.` (repo root, not `apps/ovok-cms`)
- **Config file:** `apps/ovok-cms/railway.toml` or `apps/ovok-control-plane/railway.toml`
- Attach a **Postgres** plugin per service (separate databases)

Railway injects `PORT` and `DATABASE_URL` automatically. Both apps read these.

## 2. ovok-cms environment variables

| Variable                    | Required | Notes                                                                 |
| --------------------------- | -------- | --------------------------------------------------------------------- |
| `DATABASE_URI`              | Yes\*    | Railway Postgres sets `DATABASE_URL` — also accepted                  |
| `PAYLOAD_SECRET`            | Yes      | 32+ random chars                                                      |
| `PAYLOAD_PUBLIC_SERVER_URL` | Yes      | Public Railway URL, e.g. `https://ovok-cms-production.up.railway.app` |
| `PAYLOAD_INTERNAL_API_KEY`  | Yes      | Shared with control plane + ovok-core                                 |
| `S3_BUCKET`                 | Prod     | Enables S3 media storage                                              |
| `S3_ACCESS_KEY_ID`          | Prod     |                                                                       |
| `S3_SECRET_ACCESS_KEY`      | Prod     |                                                                       |
| `S3_REGION`                 | Prod     | Use `auto` for R2                                                     |
| `S3_ENDPOINT`               | Optional | R2 / MinIO endpoint                                                   |
| `CDN_URL`                   | Prod     | e.g. `https://cdn.cms.ovok.io`                                        |
| `OVOK_CORE_INTERNAL_URL`    | Optional | Cache purge webhook target                                            |

\*Map Railway's `DATABASE_URL` → `DATABASE_URI` in the Variables tab, or rely on the built-in fallback in `payload.config.ts`.

## 3. ovok-control-plane environment variables

| Variable                     | Required | Notes                                       |
| ---------------------------- | -------- | ------------------------------------------- |
| `CONTROL_PLANE_DATABASE_URL` | Yes\*    | Or use Railway's `DATABASE_URL` (supported) |
| `OVOK_INTERNAL_API_KEY`      | Yes      | Same value as `PAYLOAD_INTERNAL_API_KEY`    |
| `OVOK_CMS_URL`               | Yes      | Internal Railway URL of ovok-cms service    |

## 4. Startup behaviour

Both containers run **migrate-on-start**:

- **ovok-cms:** `payload migrate` → `node server.js` (plus `prodMigrations` safety net on connect)
- **ovok-control-plane:** `drizzle-kit migrate` → `node dist/index.js`

## 5. Local Docker test (before push)

```bash
# From repo root
docker build -f apps/ovok-cms/Dockerfile -t ovok-cms .
docker build -f apps/ovok-control-plane/Dockerfile -t ovok-control-plane .

# Or via compose (Postgres only)
docker compose up cms-postgres control-plane-postgres -d
docker compose --profile apps up --build
```

## 6. Networking

Wire `OVOK_CMS_URL` on the control plane to the **private** Railway hostname of the CMS service (e.g. `http://ovok-cms.railway.internal:3000` or the public URL during early setup).
