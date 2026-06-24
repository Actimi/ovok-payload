---
title: Public delivery
sidebar_position: 4
sidebar_label: Public delivery
description: Serve published CMS content to your frontend with /v1/public/cms. Authenticates with an API key, returns only published items, scoped to the key's project.
keywords:
  - Public delivery
  - CMS delivery API
  - headless CMS read
  - CMS API key
---

# Public delivery

Public delivery is the surface your **frontend** hits. It serves
published content only, authenticates with a project-scoped API key
(no JWT, no user session), and is safe to call from browsers and
mobile apps.

```
GET https://api.sandbox.ovok.com/v1/public/cms/{typeSlug}/items?environment=dev&projectId={medplumProjectId}
GET https://api.sandbox.ovok.com/v1/public/cms/{typeSlug}/items/{idOrSlug}?environment=dev&projectId={medplumProjectId}
```

## Required query parameters

| Param         | Required | Description                                                 |
| ------------- | -------- | ----------------------------------------------------------- |
| `environment` | Yes      | `dev`, `staging`, or `prod` — selects the content partition |
| `projectId`   | Yes      | Medplum project UUID; resolves the Payload tenant           |

Use `projectId`, not `projectSlug`, on this surface.

## Authentication

Send the API key as `Authorization: Bearer …`, `x-api-key: …`, or
`?apiKey=…`. Each key is bound to exactly one project when
`PAYLOAD_CMS_PUBLIC_API_KEY` is configured on ovok-core (sandbox may
allow unauthenticated access when that env var is unset).

Mint keys from the Console at **Settings → API keys → CMS**:

![Console Settings API keys tab with CMS API keys card and a New API key button](/img/walkthrough/console-06-api-keys.png)

```http
GET /v1/public/cms/pages/items?environment=dev&projectId=4897826b-4ff5-4ce4-a96a-849a40f51f60 HTTP/1.1
Host: api.sandbox.ovok.com
Authorization: Bearer cmspub_a4f3b21c...
Accept: application/json
```

[How to mint a key →](/dev/cms/api-keys)

:::tip Key safety
API keys identify your project. They're meant to be shipped in your
frontend bundle — they only grant read access to _published_ content.
But: rotate them on schedule, scope them per app, and never check them
into a public repo.
:::

## List items in a collection

```bash
curl "https://api.sandbox.ovok.com/v1/public/cms/pages/items?environment=dev&projectId=$MEDPLUM_PROJECT_ID" \
  -H "Authorization: Bearer $OVOK_CMS_KEY"
```

Additional query params:

| Param              | Type    | Description                                        |
| ------------------ | ------- | -------------------------------------------------- |
| `limit`            | integer | Max items per page (default 10, max 100)           |
| `page`             | integer | 1-indexed page number                              |
| `sort`             | string  | Sort field, prefix `-` to reverse (`-publishedAt`) |
| `where[field][op]` | JSON    | Payload's standard filter syntax                   |

Example — recent published blog posts, newest first:

```bash
curl "https://api.sandbox.ovok.com/v1/public/cms/posts/items?environment=dev&projectId=$MEDPLUM_PROJECT_ID&sort=-publishedAt&limit=5" \
  -H "Authorization: Bearer $OVOK_CMS_KEY"
```

## Get one item

By ID:

```bash
curl "https://api.sandbox.ovok.com/v1/public/cms/pages/items/abc123?environment=dev&projectId=$MEDPLUM_PROJECT_ID" \
  -H "Authorization: Bearer $OVOK_CMS_KEY"
```

By slug (Payload's slug field, if your collection defines one):

```bash
curl "https://api.sandbox.ovok.com/v1/public/cms/pages/items/pricing?environment=dev&projectId=$MEDPLUM_PROJECT_ID" \
  -H "Authorization: Bearer $OVOK_CMS_KEY"
```

The endpoint resolves slug vs ID automatically. Drafts and unpublished
items return `404` here regardless of whether you ask by ID or slug.

## What's not returned

Public delivery hides the bits authors don't want public:

- Items with `_status: draft` or `_status: published` but `publishedAt`
  in the future
- Soft-deleted items
- Internal-only fields (anything marked `admin.hidden` in the Payload
  collection config)
- Items not in the key's project or wrong `environment`

If you can read an item via `/v1/content/api/...` but not via
`/v1/public/cms/.../items/...`, check draft status, environment, and
`projectId` first.

## CORS

Public delivery is the only CMS surface with browser-friendly CORS.
The proxy returns `Access-Control-Allow-Origin: *` for `GET` and
`HEAD`. If you need a stricter origin set, terminate at your own
edge (Vercel, Cloudflare) and lock CORS there.

## Caching

Responses include `Cache-Control: public, max-age=60, s-maxage=300`
by default — a minute on the client, five minutes on shared caches.
Publishing an item invalidates the shared cache for that item's
collection via a fan-out hook. Custom cache headers per collection are
on the roadmap.

## Errors

| Status | Meaning                                                            |
| ------ | ------------------------------------------------------------------ |
| `401`  | API key missing or revoked                                         |
| `403`  | API key belongs to a project where CMS is disabled                 |
| `404`  | Item doesn't exist, isn't published, or belongs to another project |
| `429`  | Rate-limited — back off and retry                                  |
| `502`  | Tenant unreachable — retry                                         |

## Next

- [CMS environments](/dev/cms/environments) — dev / staging / prod
- [API keys](/dev/cms/api-keys) — mint, rotate, scope
- [Authoring](/dev/cms/authoring) — the write-side surface
