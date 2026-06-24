---
title: Deploy Payload stack
sidebar_position: 4
description: Railway deployment for payload-ovok and ovok-control-plane, including private networking and shared secrets.
keywords:
  - Railway deployment
  - Payload CMS deploy
  - ovok-control-plane
---

# Deploy Payload stack

Both Ovok Payload apps deploy from the **monorepo root** of
`Actimi/ovok-payload` (required for `@ovok/contracts`).

## Railway services (sandbox)

| Railway service      | App           | Health check            |
| -------------------- | ------------- | ----------------------- |
| `payload-ovok`       | ovok-cms      | `GET /api/_ovok/health` |
| `ovok-control-plane` | control plane | `GET /health`           |
| `ovok-internal`      | ovok-core     | `GET /healthcheck`      |

**Dashboard settings (each ovok-payload service):**

- **Root directory:** `.` (repo root, not `apps/ovok-cms`)
- **Config file:** `apps/ovok-cms/railway.toml` or `apps/ovok-control-plane/railway.toml`

Attach a **dedicated Postgres plugin per service** — do not share one
database between CMS and control plane.

## Shared secret

`PAYLOAD_INTERNAL_API_KEY` on payload-ovok must match
`OVOK_INTERNAL_API_KEY` on ovok-control-plane and ovok-core
(`PAYLOAD_INTERNAL_API_KEY` there too).

## payload-ovok variables

| Variable                    | Example                                          |
| --------------------------- | ------------------------------------------------ |
| `DATABASE_URI`              | `${{ovok-cms-postgres.DATABASE_URL}}`            |
| `PAYLOAD_SECRET`            | 32+ random chars                                 |
| `PAYLOAD_PUBLIC_SERVER_URL` | `https://payload-ovok-production.up.railway.app` |
| `PAYLOAD_INTERNAL_API_KEY`  | shared secret                                    |
| `OVOK_CORE_INTERNAL_URL`    | `http://ovok-internal.railway.internal:4000`     |

Optional production media: `S3_BUCKET`, `S3_*`, `CDN_URL`,
`CDN_PURGE_API_TOKEN`.

## ovok-control-plane variables

| Variable                     | Example                                     |
| ---------------------------- | ------------------------------------------- |
| `CONTROL_PLANE_DATABASE_URL` | `${{ovok-control-plane-db.DATABASE_URL}}`   |
| `OVOK_INTERNAL_API_KEY`      | same shared secret                          |
| `OVOK_CMS_URL`               | `http://payload-ovok.railway.internal:8080` |
| `PORT`                       | `4001`                                      |

## ovok-internal (ovok-core) variables

| Variable                    | Example                                           |
| --------------------------- | ------------------------------------------------- |
| `PAYLOAD_CMS_URL`           | `http://payload-ovok.railway.internal:8080`       |
| `PAYLOAD_CONTROL_PLANE_URL` | `http://ovok-control-plane.railway.internal:4001` |
| `PAYLOAD_INTERNAL_API_KEY`  | same shared secret                                |

Use **private** `.railway.internal` hostnames for service-to-service
calls within the Railway project.

## Startup

Both containers **migrate on start**:

- **payload-ovok:** `payload migrate` → Next.js server
- **ovok-control-plane:** `drizzle-kit migrate` → Hono server

## Local Docker smoke test

```bash
# From ovok-payload repo root
docker build -f apps/ovok-cms/Dockerfile -t ovok-cms .
docker build -f apps/ovok-control-plane/Dockerfile -t ovok-control-plane .
docker compose up cms-postgres control-plane-postgres -d
docker compose --profile apps up --build
```

## Next

- [Payload stack](./payload-stack) — architecture overview
- [Enable CMS](/dev/cms/enable) — turn CMS on for a project
