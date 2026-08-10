import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * Adds French and Spanish to the locale roster. A separate migration on
 * purpose: Payload skips already-applied migrations by name, so an
 * environment that ran 20260806_000000 with ('de','en') would never see an
 * in-place edit of that file — enum values are only ever added additively.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "_locales" ADD VALUE IF NOT EXISTS 'fr';
  `)
  await db.execute(sql`
    ALTER TYPE "_locales" ADD VALUE IF NOT EXISTS 'es';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres cannot remove enum values. Rolling back the roster would require
  // rebuilding the type and every dependent column; the extra values are
  // harmless when unused, so down is a no-op.
  await db.execute(sql`SELECT 1;`)
}
