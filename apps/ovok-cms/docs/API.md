# ovok-cms API

Multi-tenant Payload CMS runtime. All dashboard and content routes are reached through **ovok-core** in production; direct access requires the internal auth headers below.

## Authentication

Every request (except health and internal provisioning) must include:

| Header                | Description                                       |
| --------------------- | ------------------------------------------------- |
| `x-ovok-internal-key` | Shared secret (`PAYLOAD_INTERNAL_API_KEY`)        |
| `x-ovok-tenant-id`    | Payload `tenants` document ID                     |
| `x-ovok-environment`  | `dev` \| `staging` \| `prod` (required on writes) |

## Ovok-specific endpoints

Payload 3 mounts custom endpoints under `/api`. The `path` values in `src/endpoints/` are relative (e.g. `/_ovok/health`); callers use the full URL below.

### `GET /api/_ovok/health`

Liveness and database connectivity check.

**Response:** `{ status: 'ok' | 'error', timestamp: string }`

**Cache-Control:** `no-store`

### `GET /api/_ovok/schema`

Normalised collection schema for the Ovok Dashboard form renderer.

**Response:** `{ collections: NormalisedCollection[] }`

**Cache-Control:** `private, max-age=300`

### `POST /api/_ovok/tenants/provision`

Idempotent tenant provisioning (control plane only). Requires `x-ovok-internal-key` only. (Payload config path: `/_ovok/tenants/provision`.)

**Body:**

```json
{
  "slug": "my-project",
  "medplumProjectId": "550e8400-e29b-41d4-a716-446655440000",
  "active": true
}
```

**Response:** `{ tenant, created: boolean }`

## Standard Payload REST

| Method                | Path                | Description                       |
| --------------------- | ------------------- | --------------------------------- |
| GET/POST/PATCH/DELETE | `/api/{collection}` | CRUD for all collections          |
| POST                  | `/api/graphql`      | GraphQL API                       |
| POST                  | `/api/media`        | Media upload (S3 when configured) |

### Collections

| Slug            | Purpose                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------- |
| `tenants`       | Project registry (Payload side)                                                          |
| `content-types` | Dynamic content type definitions                                                         |
| `content-items` | Content rows per type                                                                    |
| `media`         | Uploaded assets (CDN URLs when `CDN_URL` set)                                            |
| `posts`         | Example blog collection                                                                  |
| `release-notes` | Localized changelog posts (title/excerpt/body per locale, tags, publishedAt)             |
| `legal-pages`   | Localized legal documents keyed by stable slug (terms-and-conditions, data-privacy, ...) |
| `users`         | Synthetic auth collection (not populated)                                                |

All tenant-scoped collections include `tenant` (multi-tenant plugin) and `environment` fields.

### Localization

Locales: `de` (default + fallback), `en`, `fr`, `es` — roster in
`@ovok/contracts` (`CMS_LOCALES`). Localized fields accept/return one value
per locale: read with `?locale=<code>` (missing translations fall back to
`de`), read every translation with `?locale=all`, and write one locale per
request via `?locale=<code>`. `GET /api/_ovok/schema` exposes the roster
(`localization`) and per-field `localized` flags for form rendering. Adding a
locale: see `LOCALES.md`.

## Environment isolation

- Reads are scoped to `x-ovok-environment` (defaults to `dev` if header missing on read)
- Writes require a valid `x-ovok-environment` header
- Composite unique indexes: `(tenant, environment, slug)` on content-types, content-items, posts

## Media & CDN

When `S3_BUCKET` and `CDN_URL` are configured:

- Uploads go to S3/R2 with prefix `media/`
- `url` fields return `{CDN_URL}/media/{filename}`
- Delete/replace triggers CDN purge when `CDN_PURGE_API_TOKEN` is set

## Cache invalidation

Content-type and content-item writes POST to ovok-core `POST /internal/cache/purge` when `OVOK_CORE_INTERNAL_URL` is set.

## Migrations

```bash
pnpm migrate          # apply pending migrations
pnpm migrate:create   # generate migration after schema changes
pnpm start:prod       # migrate then start (production entrypoint)
```
