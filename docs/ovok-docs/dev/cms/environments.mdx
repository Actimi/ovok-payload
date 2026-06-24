---
title: CMS environments
sidebar_position: 6
sidebar_label: Environments
description: How dev, staging, and prod content are isolated inside a single Payload tenant per Ovok project.
keywords:
  - CMS environments
  - Payload multi-environment
  - content isolation
---

# CMS environments

Each Ovok project gets one Payload **tenant** (row in `tenants`). Within
that tenant, content is further scoped by **environment**:

| Environment | Typical use                  |
| ----------- | ---------------------------- |
| `dev`       | Sandbox / integration drafts |
| `staging`   | Pre-release validation       |
| `prod`      | Live published content       |

## How isolation works

- Every tenant-scoped collection (`content-types`, `content-items`,
  `posts`, …) includes an `environment` field.
- Composite unique indexes prevent slug collisions **within** an
  environment, not across them: `(tenant, environment, slug)`.
- ovok-core forwards `x-ovok-environment` on every CMS proxy call.
- Writes require a valid environment header; reads default to `dev` when
  the header is missing (authoring proxy only — public delivery passes
  `environment` explicitly).

## Enabling an environment

Environments are enabled per project through the control plane (Console
→ Settings → Payload CMS, or `POST /v1/cms/projects/:slug/environments`).

Each enablement:

1. Records `project_environments` in control-plane Postgres.
2. Provisions the Payload tenant if this is the first environment.
3. Marks the environment `active`.

Suspending an environment sets `status: suspended` without deleting
content rows.

## Public delivery

Published reads must include the target environment as a query parameter:

```bash
curl "https://api.sandbox.ovok.com/v1/public/cms/pages/items?environment=dev&projectId=$MEDPLUM_PROJECT_ID" \
  -H "Authorization: Bearer $OVOK_CMS_KEY"
```

| Param         | Required | Description                             |
| ------------- | -------- | --------------------------------------- |
| `environment` | Yes      | `dev`, `staging`, or `prod`             |
| `projectId`   | Yes      | Medplum project UUID for the CMS tenant |

The API key alone identifies the Ovok project; `projectId` resolves
the Payload tenant. Do not use `projectSlug` on public delivery.

## Production write policy

Production **read-only** enforcement for dashboard writes is handled at
the **ovok-core proxy**, not inside Payload. Payload still scopes data
by tenant + environment for all operations.

## Next

- [Public delivery](/dev/cms/public-delivery) — frontend reads
- [Authoring](/dev/cms/authoring) — backend writes via `/v1/content`
