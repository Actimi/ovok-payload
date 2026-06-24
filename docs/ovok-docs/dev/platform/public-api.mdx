---
title: Public API surface
sidebar_position: 2
description: Map of every public HTTPS route on api.sandbox.ovok.com — auth, projects, CMS, FHIR, wearables, and more.
keywords:
  - public API
  - route map
  - Ovok API reference
---

# Public API surface

The **High Level API** and **FHIR API** sections in this site are generated
from the OpenAPI spec (`pnpm run docs` on ovok-core). This page is the
one-screen map of what exists on the public host before you drill into a
specific endpoint.

Base URL (sandbox / dev tier):

```
https://api.sandbox.ovok.com
```

Authenticate with `Authorization: Bearer <project-jwt>` unless noted.
Login first via `POST /v2/auth/login`.

## Route families

| Family                  | Prefix                        | Auth               | Purpose                                          |
| ----------------------- | ----------------------------- | ------------------ | ------------------------------------------------ |
| **Authentication**      | `/v2/auth/login`, `/auth/*`   | Mixed              | Login, register, sessions, tenant MFA            |
| **Projects**            | `/v1/projects/*`              | JWT                | Project settings, members, features, tenant code |
| **Content authoring**   | `/v1/content/*`               | JWT                | Payload CMS proxy (requires CMS enabled)         |
| **Public CMS delivery** | `/v1/public/cms/*`            | API key            | Published content reads only                     |
| **CMS provisioning**    | `/v1/cms/projects/*`          | JWT (admin)        | Enable environments, control-plane proxy         |
| **Documents**           | `/document/*`                 | JWT / public token | Upload, search, public file URLs                 |
| **Localization**        | `/localization/*`, `/locales` | JWT / public       | i18n keys and mapped content                     |
| **Organizations**       | `/organizations/code/*`       | JWT                | Org-code lookup                                  |
| **Wearables**           | `/v1/wearables/*`             | JWT                | Connect providers, webhooks (Early Access)       |
| **Bots**                | `/bots`                       | JWT                | Execute project bots                             |
| **AI translation**      | `/ai/translation`             | JWT                | Translate text                                   |
| **Partner**             | `/v1/partner/health-check`    | Partner auth       | Integration health probes                        |
| **FHIR**                | `/fhir/R4/*`, `/fhir/R5/*`    | JWT / Basic        | Clinical resources + custom operations           |

Internal-only routes (sub-project admin, legacy internal CMS, cache purge)
are **not** listed here — they live in the internal OpenAPI spec.

## CMS routes (Payload)

When `PAYLOAD_CMS_URL`, `PAYLOAD_CONTROL_PLANE_URL`, and
`PAYLOAD_INTERNAL_API_KEY` are configured on ovok-core, these surfaces
register. Without them, CMS routes return **404**.

| Method | Path                                         | Notes                                    |
| ------ | -------------------------------------------- | ---------------------------------------- |
| `*`    | `/v1/content/*`                              | Proxies to payload-ovok (`/api/*`)       |
| `GET`  | `/v1/public/cms/{typeSlug}/items`            | Requires `?environment=` + `?projectId=` |
| `GET`  | `/v1/public/cms/{typeSlug}/items/{idOrSlug}` | Published items only                     |
| `*`    | `/v1/cms/projects/*`                         | Proxies to ovok-control-plane            |

See [Content (CMS)](../cms/index) for guides; see
[Payload stack](./payload-stack) for infrastructure.

## Authentication quick reference

```bash
# 1. Login
curl -X POST https://api.sandbox.ovok.com/v2/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"***","clientId":"<ACTIMI_CLIENT_ID>"}'

# 2. Call a project route
curl https://api.sandbox.ovok.com/v1/projects/me/features \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Where to go next

- [High Level API](../api/high-level/index) — auto-generated per-endpoint reference
- [FHIR API](../api/fhir/index) — FHIR R5 resources + custom ops
- [Release tiers](./environments) — sandbox vs alpha vs final hosts
