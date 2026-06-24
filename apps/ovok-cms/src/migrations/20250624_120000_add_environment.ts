import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * Adds the environment dimension to tenant-scoped collections.
 * Existing rows default to `dev`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "content_types" ADD COLUMN IF NOT EXISTS "environment" varchar DEFAULT 'dev' NOT NULL;
    ALTER TABLE "content_items" ADD COLUMN IF NOT EXISTS "environment" varchar DEFAULT 'dev' NOT NULL;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "environment" varchar DEFAULT 'dev' NOT NULL;
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "environment" varchar DEFAULT 'dev' NOT NULL;

    CREATE INDEX IF NOT EXISTS "content_types_environment_idx" ON "content_types" USING btree ("environment");
    CREATE INDEX IF NOT EXISTS "content_items_environment_idx" ON "content_items" USING btree ("environment");
    CREATE INDEX IF NOT EXISTS "media_environment_idx" ON "media" USING btree ("environment");
    CREATE INDEX IF NOT EXISTS "posts_environment_idx" ON "posts" USING btree ("environment");

    CREATE UNIQUE INDEX IF NOT EXISTS "content_types_tenant_environment_slug_idx"
      ON "content_types" ("tenant_id", "environment", "slug");
    CREATE UNIQUE INDEX IF NOT EXISTS "content_items_tenant_environment_slug_idx"
      ON "content_items" ("tenant_id", "environment", "slug");
    CREATE UNIQUE INDEX IF NOT EXISTS "posts_tenant_environment_slug_idx"
      ON "posts" ("tenant_id", "environment", "slug");
    CREATE INDEX IF NOT EXISTS "content_items_tenant_environment_status_idx"
      ON "content_items" ("tenant_id", "environment", "status");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "content_items_tenant_environment_status_idx";
    DROP INDEX IF EXISTS "posts_tenant_environment_slug_idx";
    DROP INDEX IF EXISTS "content_items_tenant_environment_slug_idx";
    DROP INDEX IF EXISTS "content_types_tenant_environment_slug_idx";
    DROP INDEX IF EXISTS "posts_environment_idx";
    DROP INDEX IF EXISTS "media_environment_idx";
    DROP INDEX IF EXISTS "content_items_environment_idx";
    DROP INDEX IF EXISTS "content_types_environment_idx";

    ALTER TABLE "posts" DROP COLUMN IF EXISTS "environment";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "environment";
    ALTER TABLE "content_items" DROP COLUMN IF EXISTS "environment";
    ALTER TABLE "content_types" DROP COLUMN IF EXISTS "environment";
  `)
}
