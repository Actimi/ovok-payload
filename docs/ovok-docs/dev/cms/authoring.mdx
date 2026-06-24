---
title: Authoring with the Content API
sidebar_position: 3
sidebar_label: Authoring
description: Read and write CMS content from a trusted backend using /v1/content. Forwards to the project's Payload tenant with the caller's project ID as the tenant scope.
keywords:
  - Content API
  - Payload CMS authoring
  - headless CMS write
---

# Authoring with the Content API

`/v1/content/*` is a thin reverse-proxy in front of your project's
Payload CMS tenant. Every authoring action — create a collection item,
upload media, publish a draft — flows through it.

This is the same surface the Console uses internally. You can call it
from your own backend any time you need to script content moves
(seed data, programmatic publishes, migrations).

For the UI side of the same API — collection browser, edit form, media
library, drafts and publishing — open the **Content** section of the
Console once CMS is enabled. See [Enable CMS](/dev/cms/enable).

:::info Screenshots of the Payload admin UI
The Payload-backed authoring surface (collections list, item edit
form, media uploader, publish flow) is captured on a CMS-enabled
project. Until your project flips `CONTENT_ENABLED` on, the
`/v1/content/*` proxy returns `403` and the Console's `Content`
section shows the **Payload CMS · OFF** card.
:::

:::info When to use the Content API vs Public delivery

- **Content API** (`/v1/content/*`) — writes and admin reads. Requires
  a project JWT. Use from trusted backends, the Console, CI jobs.
- **Public delivery** (`/v1/public/cms/*`) — published-only reads with
  an API key. Use from browsers, mobile apps, anything untrusted.
  :::

## Authentication

Send a project bearer JWT in `Authorization`. ovok-core resolves your
Medplum project from the JWT, looks up (or provisions) the Payload
tenant, and injects these headers on the upstream call — you do **not**
set them yourself:

| Header                      | Set by    | Purpose                      |
| --------------------------- | --------- | ---------------------------- |
| `x-ovok-internal-key`       | ovok-core | Cluster auth to payload-ovok |
| `x-ovok-tenant-id`          | ovok-core | Payload multi-tenant scope   |
| `x-ovok-environment`        | ovok-core | `dev` \| `staging` \| `prod` |
| `x-ovok-medplum-project-id` | ovok-core | Medplum project UUID         |

Select the environment with `?environment=dev` on the request URL or
`x-ovok-environment` if you control headers (Console backends typically
use the query param). Defaults to `dev` on sandbox.

```http
GET /v1/content/api/content-types?environment=dev HTTP/1.1
Host: api.sandbox.ovok.com
Authorization: Bearer <project-jwt>
Accept: application/json
```

## Path mapping

The proxy strips `/v1/content` and forwards to payload-ovok:

| You call                                | Payload receives             |
| --------------------------------------- | ---------------------------- |
| `GET /v1/content/api/{collection}`      | `GET /api/{collection}`      |
| `GET /v1/content/api/{collection}/{id}` | `GET /api/{collection}/{id}` |
| `GET /v1/content/_ovok/schema`          | `GET /api/_ovok/schema`      |
| `POST /v1/content/api/media`            | `POST /api/media`            |

Legacy unversioned `/content/*` URLs are normalised the same way if your
client still sends them, but **new integrations should use `/v1/content/*`**.

## What the proxy forwards

The catch-all proxy supports every method Payload exposes:

- `GET /v1/content/{path}` — list, find by ID, read globals
- `POST /v1/content/{path}` — create items, upload media, login
- `PUT /v1/content/{path}` / `PATCH /v1/content/{path}` — update items
- `DELETE /v1/content/{path}` — delete items
- `HEAD` / `OPTIONS` — CORS preflight + capability probes

The `{path}` is whatever Payload route you'd call directly — typically
`api/<collection>` or `api/<collection>/<id>` or `api/globals/<slug>`.

See the [auto-generated reference](/dev/api/high-level/content/content-proxy-controller-proxy) for the
per-method OpenAPI schema.

## Examples

### List a collection

```bash
curl "https://api.sandbox.ovok.com/v1/content/api/content-types?environment=dev" \
  -H "Authorization: Bearer $OVOK_PROJECT_JWT"
```

Returns Payload's standard paginated response:

```json
{
  "docs": [
    {
      "id": "abc...",
      "slug": "home",
      "title": "Welcome",
      "_status": "published"
    }
  ],
  "totalDocs": 1,
  "limit": 10,
  "totalPages": 1,
  "page": 1
}
```

### Create a content item

```bash
curl "https://api.sandbox.ovok.com/v1/content/api/content-items?environment=dev" \
  -X POST \
  -H "Authorization: Bearer $OVOK_PROJECT_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "pricing",
    "title": "Pricing",
    "_status": "draft"
  }'
```

### Upload media

`multipart/form-data` is streamed through the proxy unbuffered, so
large uploads don't pin the API process:

```bash
curl "https://api.sandbox.ovok.com/v1/content/api/media?environment=dev" \
  -X POST \
  -H "Authorization: Bearer $OVOK_PROJECT_JWT" \
  -F "file=@hero.png" \
  -F 'alt=Hero image'
```

### Publish a draft

In Payload, "publish" is just a status update:

```bash
curl "https://api.sandbox.ovok.com/v1/content/api/content-items/$ITEM_ID?environment=dev" \
  -X PATCH \
  -H "Authorization: Bearer $OVOK_PROJECT_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "_status": "published" }'
```

Once published, the item is reachable via [Public delivery](/dev/cms/public-delivery).

## What the proxy strips

The proxy removes hop-by-hop headers before forwarding either direction:
`connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`,
`te`, `trailers`, `transfer-encoding`, `upgrade`, `host`, `content-length`.

Body handling:

- `GET` / `HEAD` / `DELETE` / `OPTIONS` are sent without a body.
- JSON / urlencoded bodies are forwarded as the parsed object.
- Multipart / octet-stream / anything Nest didn't pre-parse is piped
  straight through as a stream.

## Errors

| Status | Meaning                                                       |
| ------ | ------------------------------------------------------------- |
| `403`  | CMS environment not enabled, suspended, or prod write blocked |
| `403`  | JWT missing Medplum project context — re-auth                 |
| `402`  | Subscription has lapsed — see ActiveSubscriptionGuard         |
| `502`  | Payload tenant is unreachable — retry, or check Status        |

## Next

- [Public delivery](/dev/cms/public-delivery) — read published content from apps
- [Content API reference](/dev/api/high-level/content/content-proxy-controller-proxy)
