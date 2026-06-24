# Ovok docs source

Single source of truth for **written** Ovok documentation published to
[Actimi/ovok-docs](https://github.com/Actimi/ovok-docs) (`dev` branch).

CI (`.github/workflows/publish-ovok-docs.yml`) publishes the **full site**:

| Layer                           | Source                                | Destination on ovok-docs    |
| ------------------------------- | ------------------------------------- | --------------------------- |
| Intro, platform, surfaces, CMS  | `docs/ovok-docs/dev/`                 | `docs/dev/`                 |
| Sidebar                         | `docs/ovok-docs/sidebars/_factory.ts` | `sidebars/_factory.ts`      |
| High Level + FHIR API reference | ovok-core `backend.yml` artifact      | `docs/dev/api/` (generated) |
| OpenAPI spec                    | ovok-core `sandbox` branch            | `openapi/dev-public.yaml`   |

Requires `SDK_REPO_TOKEN` (push access to `Actimi/ovok-docs`, read access to
ovok-core Actions artifacts).

## Layout

```
docs/ovok-docs/
  dev/
    intro.md              Site landing page
    platform/             Overview, release tiers, Payload stack, deployment
    surfaces/             Console, Data Dashboard
    cms/                  Content API guides
  sidebars/_factory.ts    Docusaurus sidebar for all sections
```

## Local preview

```bash
node scripts/sync-ovok-docs-stage.mjs
# Copy staging/docs/dev/ and staging/sidebars/ into a local ovok-docs clone, then:
# cd ovok-docs && pnpm install && pnpm start
```

OpenAPI reference pages require a local `openapi/dev-public.yaml` (from
ovok-core `pnpm run docs` or the latest CI artifact).
