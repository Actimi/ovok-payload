# Ovok Core Proxy Integration Contract

This document defines how **ovok-core** (NestJS proxy) integrates with the Ovok Payload platform. Implement this contract when wiring public and dashboard routes to `ovok-cms` and `ovok-control-plane`.

## Required Headers (CMS requests)

Every proxied request to `ovok-cms` must include:

| Header                      | Value                                             | Required    |
| --------------------------- | ------------------------------------------------- | ----------- |
| `x-ovok-internal-key`       | Shared secret matching `PAYLOAD_INTERNAL_API_KEY` | Yes         |
| `x-ovok-tenant-id`          | Payload `tenants` document ID                     | Yes         |
| `x-ovok-environment`        | `dev` \| `staging` \| `prod`                      | Yes         |
| `x-ovok-medplum-project-id` | Medplum project UUID                              | Recommended |

Control plane requests require only `x-ovok-internal-key` (matching `OVOK_INTERNAL_API_KEY`).

## Routing Map

| Public route (ovok-core)     | Backend                | Cache       |
| ---------------------------- | ---------------------- | ----------- |
| `/v1/content/*`              | `ovok-cms`             | `no-store`  |
| `/v1/cms/projects/*`         | `ovok-control-plane`   | `no-store`  |
| `/v1/public/cms/:type/items` | `ovok-cms` (read-only) | Redis + CDN |
| Media URLs in responses      | CDN direct             | 1 year      |

### CMS direct endpoints (cluster-internal)

| Method | Path                           | Purpose                                        |
| ------ | ------------------------------ | ---------------------------------------------- |
| GET    | `/api/_ovok/schema`            | Schema introspection for dashboard             |
| GET    | `/api/_ovok/health`            | Liveness + DB check                            |
| POST   | `/api/_ovok/tenants/provision` | Idempotent tenant provisioning (control plane) |
| \*     | `/api/*`                       | Standard Payload REST                          |
| POST   | `/api/graphql`                 | GraphQL                                        |

### Control plane endpoints

| Method | Path                                   | Purpose             |
| ------ | -------------------------------------- | ------------------- |
| GET    | `/health`                              | Liveness + DB check |
| POST   | `/v1/projects`                         | Create project      |
| GET    | `/v1/projects`                         | List projects       |
| GET    | `/v1/projects/:slug`                   | Project detail      |
| POST   | `/v1/projects/:slug/environments`      | Enable environment  |
| DELETE | `/v1/projects/:slug/environments/:env` | Suspend environment |
| GET    | `/v1/projects/:slug/environments`      | Environment matrix  |

## Redis Cache Keys (ovok-core)

Defined in `@ovok/contracts`:

```
cms:{tenantId}:{env}:{contentTypeSlug}:items   TTL 60s
cms:{tenantId}:{env}:schema                    TTL 300s
```

Invalidate via `POST /internal/cache/purge` with body:

```json
{
  "tenantId": "...",
  "environment": "dev",
  "contentTypeSlug": "landing",
  "purgeSchema": false
}
```

CMS hooks call this endpoint (or Redis DEL directly if shared) on content-type and content-item writes.

## HTTP Cache-Control (ovok-core responses)

| Route type                | Header                                            |
| ------------------------- | ------------------------------------------------- |
| Public content GET        | `public, s-maxage=60, stale-while-revalidate=300` |
| Dashboard / authenticated | `no-store`                                        |
| Schema proxy              | `private, max-age=300`                            |
| Health                    | `no-store`                                        |

## Media CDN

- All `media.url` values from CMS use `CDN_URL` prefix
- Public sites load images directly from CDN — never through ovok-core
- Cache-Control on uploads: `public, max-age=31536000, immutable`

## Environment Write Restrictions

Production read-only enforcement for dashboard writes is handled at the **ovok-core proxy** layer, not in Payload. Payload scopes all reads/writes by tenant + environment.

## Provisioning Flow

1. Dashboard calls ovok-core → control plane `POST /v1/projects/:slug/environments`
2. Control plane inserts `project_environments` row (`provisioning`)
3. Control plane calls CMS `POST /api/tenants` with `{ medplumProjectId, slug, active: true }`
4. Control plane updates row → `active`

No new containers are provisioned per project — tenant isolation is row-level in shared Postgres.
