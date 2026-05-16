import type { Payload } from 'payload'

/**
 * Postgres indexes for `content_items`.
 *
 * Two key choices:
 *
 *  - **CREATE INDEX CONCURRENTLY**: the first time this runs on a busy
 *    DB it has to scan every row. CONCURRENTLY does that without an
 *    exclusive lock — writes keep flowing during creation. The cost
 *    is two table passes instead of one, but for an `onInit` that
 *    runs at boot (before the API is even accepting traffic) the
 *    tradeoff is purely upside.
 *
 *  - **jsonb_path_ops** rather than jsonb_ops: smaller index (often
 *    ~30% less disk), faster updates, and our access pattern only
 *    uses `@>` containment — jsonb_path_ops covers exactly that one
 *    operator and nothing else, which is the right specialisation.
 *    The localized-unique check + future @>-based filters all use
 *    `data @> '{path: value}'::jsonb` so the index is actually hit.
 *
 * CONCURRENTLY restrictions:
 *  - Can't run inside a transaction. Drizzle's `execute(string)` does
 *    NOT wrap raw strings in an implicit transaction (verified by
 *    inspecting the postgres adapter — it pipes the SQL to the
 *    underlying client directly).
 *  - Doesn't compose with IF NOT EXISTS in older Postgres (< 11).
 *    We require ≥ 11 in production; we use both.
 *
 * Runs idempotently: re-creating an existing index is cheap (Postgres
 * checks the catalog first). Failures log without crashing boot.
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

    const statements: string[] = [
      // GIN with jsonb_path_ops — supports `@>` only (which is all we
      // use) and stays small under heavy nested-JSON data.
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS content_items_data_gin_path ON content_items USING GIN (data jsonb_path_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS content_items_ct_status ON content_items (content_type_id, status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS content_items_ct_slug ON content_items (content_type_id, slug)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS content_items_tenant_ct ON content_items (tenant_id, content_type_id)',
    ]

    // Drop the previous jsonb_ops variant from before we knew we only
    // needed @>. Cheap if it doesn't exist; reclaims ~30% disk if it
    // does. Concurrent drop doesn't block readers/writers.
    const dropOldStatements: string[] = [
      'DROP INDEX CONCURRENTLY IF EXISTS content_items_data_gin',
    ]

    for (const stmt of statements) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (drizzle.execute as any)(stmt)
    }
    for (const stmt of dropOldStatements) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (drizzle.execute as any)(stmt)
    }

    payload.logger.info(
      `[ensureContentItemIndexes] verified ${statements.length} index${statements.length === 1 ? '' : 'es'} (CONCURRENTLY, jsonb_path_ops)`,
    )
  } catch (err) {
    payload.logger.error(
      `[ensureContentItemIndexes] failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
