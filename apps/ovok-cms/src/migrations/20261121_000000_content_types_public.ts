import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * `content-types.public` opts one type into keyless public delivery. Nullable
 * with a false default, like the other checkbox columns here, so existing rows
 * stay private. Idempotent like the other migrations here.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "content_types" ADD COLUMN IF NOT EXISTS "public" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "content_types" DROP COLUMN IF EXISTS "public";
  `)
}
