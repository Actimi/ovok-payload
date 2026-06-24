# ovok-control-plane API

Project registry and environment enablement service. ovok-core proxies `/v1/cms/projects/*` here.

## Authentication

All `/v1/projects/*` routes require:

| Header                | Description                             |
| --------------------- | --------------------------------------- |
| `x-ovok-internal-key` | Shared secret (`OVOK_INTERNAL_API_KEY`) |

## Endpoints

### `GET /health`

Liveness and database connectivity.

**Response:** `{ status: 'ok', service: 'ovok-control-plane' }`

### `POST /v1/projects`

Create a project registry row.

**Body:**

```json
{
  "name": "My Project",
  "slug": "my-project",
  "medplumProjectId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `{ project }` (201)

### `GET /v1/projects`

List all projects.

**Response:** `{ projects: Project[] }`

### `GET /v1/projects/:slug`

Project detail with enabled environments.

**Response:** `{ ...project, environments: ProjectEnvironment[] }`

### `GET /v1/projects/:slug/environments`

Environment matrix for a project.

**Response:** `{ slug, environments }`

### `POST /v1/projects/:slug/environments`

Enable an environment. Provisions Payload tenant idempotently via `POST /api/_ovok/tenants/provision` on ovok-cms.

**Body:**

```json
{ "environment": "dev" }
```

**Response:** `{ environment, provisioned: boolean }` (201 when newly provisioned)

**Flow:**

1. Insert/update `project_environments` row (`provisioning`)
2. Call ovok-cms tenant provisioning
3. Update row → `active`

### `DELETE /v1/projects/:slug/environments/:env`

Suspend an environment (`status: suspended`).

**Response:** `{ environment }`

## Data model

### `projects`

| Column             | Type        | Notes                                  |
| ------------------ | ----------- | -------------------------------------- |
| id                 | UUID        | PK                                     |
| name               | text        | Display name                           |
| slug               | text        | Unique; maps to Payload `tenants.slug` |
| medplum_project_id | UUID        | Unique                                 |
| created_at         | timestamptz |                                        |

### `project_environments`

| Column      | Type        | Notes                                     |
| ----------- | ----------- | ----------------------------------------- |
| id          | UUID        | PK                                        |
| project_id  | UUID        | FK → projects                             |
| environment | text        | `dev` \| `staging` \| `prod`              |
| status      | text        | `provisioning` \| `active` \| `suspended` |
| enabled_at  | timestamptz | Set when status becomes `active`          |

Unique: `(project_id, environment)`

## Environment variables

| Variable                     | Description                               |
| ---------------------------- | ----------------------------------------- |
| `CONTROL_PLANE_DATABASE_URL` | Postgres connection string                |
| `OVOK_INTERNAL_API_KEY`      | Auth for all `/v1/projects/*` routes      |
| `OVOK_CMS_URL`               | ovok-cms base URL for tenant provisioning |
| `PORT`                       | HTTP port (default 4001)                  |

## Migrations

```bash
pnpm migrate          # drizzle-kit migrate
pnpm start:prod       # migrate then start
```
