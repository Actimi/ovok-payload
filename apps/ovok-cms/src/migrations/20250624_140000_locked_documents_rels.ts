import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * Legacy DBs created before content-types/items were added are missing
 * relationship columns on payload_locked_documents_rels, which breaks
 * tenant updates once those collections exist in the Payload config.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "content_types_id" integer,
      ADD COLUMN IF NOT EXISTS "content_items_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_content_types_fk"
        FOREIGN KEY ("content_types_id") REFERENCES "public"."content_types"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_content_items_fk"
        FOREIGN KEY ("content_items_id") REFERENCES "public"."content_items"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_content_items_fk",
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_content_types_fk",
      DROP COLUMN IF EXISTS "content_items_id",
      DROP COLUMN IF EXISTS "content_types_id";
  `)
}
