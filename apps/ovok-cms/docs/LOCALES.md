# Locales & content collections — how to extend

## Current roster

`en` (default, fallback target) · `de` · `fr` · `es` — defined once in
`packages/ovok-contracts/src/locales.ts` (`CMS_LOCALES`) and consumed by
`payload.config.ts`. Fields marked `localized: true` store one value per
locale; reads pick a locale via `?locale=` and fall back to the default when
a translation is missing. `?locale=all` returns every translation at once
(used by authoring UIs).

## Add a locale (e.g. `it`)

Locale additions are **additive-only** — Postgres enum values can never be
removed, and applied migrations are never edited in place (Payload skips
already-applied migrations by name).

1. Add the code to `CMS_LOCALES` in `packages/ovok-contracts/src/locales.ts`
   and run `pnpm --filter @ovok/contracts build`.
2. Create a new migration (copy `20260807_000000_locales_fr_es.ts`):

   ```ts
   await db.execute(sql`ALTER TYPE "_locales" ADD VALUE IF NOT EXISTS 'it';`)
   ```

   `down()` stays a no-op — document why in the file.

3. Register it in `src/migrations/index.ts`.
4. Regenerate types: `pnpm --filter @actimi/ovok-cms generate:types`.
5. Extend `tests/localizedContent.int.spec.ts` (the per-locale round-trip
   test) with the new code.
6. Downstream: ovok-core validates locale _shape_ only (nothing to change);
   authoring UIs read the roster from `GET /api/_ovok/schema` →
   `localization.locales`.

## Add a content collection

There is **one registration point**: the `CONTENT_COLLECTIONS` array in
`src/payload.config.ts`. Multi-tenancy, environment scoping, and the
`(tenant, environment, slug)` / `(tenant, environment, status)` indexes all
derive from it — index eligibility comes from whether the collection defines
`slug` / `status` fields.

1. Create the collection with
   `collections/_shared/createLocalizedContentCollection.ts` (gives you
   authenticated-only access, `slug`, `status`, timestamps) and declare only
   the collection-specific fields.
2. Add it to `CONTENT_COLLECTIONS` in `payload.config.ts`.
3. Generate the migration for the new tables (see the workflow in
   `20260806_000000_release_notes_legal_pages.ts`: build the desired schema
   into a scratch DB with a dev push, `pg_dump`-diff against a
   migrations-built DB, write the delta as idempotent SQL) and register it.
4. Regenerate types, add an int spec covering tenant + environment isolation.
5. To expose it through **public delivery**, add its slug to ovok-core's
   `PAYLOAD_CMS_PUBLIC_COLLECTIONS` env — published documents then serve from
   `GET /v1/public/cms/collections/<slug>/items[/<docSlug>]`.

## `PAYLOAD_DB_PUSH`

In dev, Payload pushes schema changes straight to the database (drizzle
push). Set `PAYLOAD_DB_PUSH=false` to run against the migration-built schema
instead — the tests do this (see `tests/setup.ts` and CI) so migration gaps
can't hide behind push.
