import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * The multi-tenant plugin's user preferences reference tenants, but the
 * hand-written initial migration created payload_preferences_rels with only
 * users_id. Payload's deleteUserPreferences queries tenants_id on every
 * tenant delete, which fails with "column does not exist" on databases built
 * purely from migrations. Same repair shape as the earlier
 * locked_documents_rels migration.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_preferences_rels"
      ADD COLUMN IF NOT EXISTS "tenants_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_preferences_rels"
        ADD CONSTRAINT "payload_preferences_rels_tenants_fk"
        FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_tenants_id_idx" ON "payload_preferences_rels" ("tenants_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_preferences_rels"
      DROP CONSTRAINT IF EXISTS "payload_preferences_rels_tenants_fk",
      DROP COLUMN IF EXISTS "tenants_id";
  `)
}
