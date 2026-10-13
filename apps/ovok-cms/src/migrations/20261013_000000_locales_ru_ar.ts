import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * Adds Russian and Arabic to the locale roster. A separate migration on
 * purpose: Payload skips already-applied migrations by name, so enum values
 * are only ever added additively (see 20260807_000000_locales_fr_es).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "_locales" ADD VALUE IF NOT EXISTS 'ru';
  `)
  await db.execute(sql`
    ALTER TYPE "_locales" ADD VALUE IF NOT EXISTS 'ar';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres cannot remove enum values; unused extra values are harmless, so
  // down is a no-op.
  await db.execute(sql`SELECT 1;`)
}
