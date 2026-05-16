import type { Payload } from 'payload'

/**
 * Postgres indexes we want on `content_items` that Payload's collection
 * config can't express directly.
 *
 * - GIN on `data` (jsonb_ops) — Payload's compound + field-level
 *   indexes are btree only, but JSONB columns benefit from a GIN
 *   index for `@>` containment queries. We also keep the index
 *   available for future operators (`?`, `?&`, `?|`) without needing
 *   another migration.
 *
 * Why `onInit` rather than a proper Drizzle migration: we're still in
 * the bootstrap `push: true` mode where Payload syncs schema on every
 * boot. A real `payload migrate` workflow lands once the schema
 * stabilises; the IF NOT EXISTS guards make this safe to run repeatedly
 * in the meantime + safe to leave in place after the migration system
 * takes over.
 *
 * Failures here log but don't crash boot — the application functions
 * without the indexes, just slower under load.
 */
export async function ensureContentItemIndexes(payload: Payload): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drizzle = (payload.db as any).drizzle as
      | { execute: (sql: { toString(): string } | string) => Promise<unknown> }
      | undefined
    if (!drizzle?.execute) {
      payload.logger.warn(
        '[ensureContentItemIndexes] No drizzle handle on payload.db; skipping index creation',
      )
      return
    }

    // Each statement uses IF NOT EXISTS so re-running is a no-op once
    // the index exists. Names follow the Postgres convention
    // <table>_<columns>_<type>.
    const statements: string[] = [
      // Broad GIN — supports `@>` (containment) for any future JSON
      // queries we add. The localized-uniqueness path still uses
      // Payload's `data->key->locale` filter which is a btree-style
      // equality and benefits from the planner narrowing by the
      // composite (content_type, status) index first.
      "CREATE INDEX IF NOT EXISTS content_items_data_gin ON content_items USING GIN (data jsonb_ops)",
      // Belt-and-braces composites in case Payload's compound index
      // creation hasn't run yet on this DB (e.g. running this branch
      // against a DB that predates the indexes:[] addition). Payload
      // generates indexes named after its own convention; ours have
      // distinct names so we don't collide.
      "CREATE INDEX IF NOT EXISTS content_items_ct_status ON content_items (content_type_id, status)",
      "CREATE INDEX IF NOT EXISTS content_items_ct_slug ON content_items (content_type_id, slug)",
      // Tenant filter — the multi-tenant plugin adds `tenant_id`. A
      // composite with content_type makes the per-tenant list reads
      // single-index scans.
      "CREATE INDEX IF NOT EXISTS content_items_tenant_ct ON content_items (tenant_id, content_type_id)",
    ]

    for (const stmt of statements) {
      // drizzle.execute accepts a string or a sql template. Strings
      // work fine for these DDL statements (no parameters).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (drizzle.execute as any)(stmt)
    }

    payload.logger.info(
      `[ensureContentItemIndexes] verified ${statements.length} index${statements.length === 1 ? '' : 'es'}`,
    )
  } catch (err) {
    payload.logger.error(
      `[ensureContentItemIndexes] failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
