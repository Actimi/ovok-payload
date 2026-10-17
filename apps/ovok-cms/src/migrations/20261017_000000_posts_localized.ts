import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { DEFAULT_CMS_LOCALE } from '@ovok/contracts'
import { sql } from '@payloadcms/db-postgres'

/**
 * Rebuilds `posts` as a localized, publishable content collection:
 * `title`/`content` move into `posts_locales` (existing values land in the
 * default locale), `excerpt` is added there, and `status` is added with
 * every EXISTING row set to 'published' so nothing previously authored
 * disappears from delivery (new rows default to 'draft'). `published_at`
 * becomes required, backfilled from `created_at`. Reuses the `_locales`
 * enum (20260806 + additive ALTERs). Idempotent like the other migrations.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_posts_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS "posts_locales" (
      "title" varchar NOT NULL,
      "excerpt" varchar,
      "content" jsonb,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "posts_locales"
        ADD CONSTRAINT "posts_locales_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "posts_locales_locale_parent_id_unique" ON "posts_locales" ("_locale", "_parent_id");
  `)

  // Single statement: the locale is a bound parameter, and node-postgres
  // rejects multiple statements in a parameterised query.
  if (await postsHasColumn({ column: 'title', db })) {
    await db.execute(sql`
      INSERT INTO "posts_locales" ("title", "content", "_locale", "_parent_id")
      SELECT "title", "content", ${DEFAULT_CMS_LOCALE}::"_locales", "id" FROM "posts"
      ON CONFLICT ("_locale", "_parent_id") DO NOTHING;
    `)
  }

  await db.execute(sql`
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "title";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "content";

    -- Existing rows get 'published' from the ADD COLUMN default; new rows default to 'draft'.
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "status" "enum_posts_status" DEFAULT 'published' NOT NULL;
    ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'draft';

    UPDATE "posts" SET "published_at" = "created_at" WHERE "published_at" IS NULL;
    ALTER TABLE "posts" ALTER COLUMN "published_at" SET NOT NULL;

    CREATE INDEX IF NOT EXISTS "posts_slug_idx" ON "posts" ("slug");
    CREATE INDEX IF NOT EXISTS "posts_status_idx" ON "posts" ("status");
    CREATE INDEX IF NOT EXISTS "posts_published_at_idx" ON "posts" ("published_at");
    CREATE INDEX IF NOT EXISTS "posts_tenant_environment_status_idx" ON "posts" ("tenant_id", "environment", "status");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "title" varchar;
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "content" jsonb;
  `)

  // Prefer the default locale, else any translation; slug as a last resort
  // so the restored NOT NULL holds.
  await db.execute(sql`
    UPDATE "posts" AS p SET ("title", "content") = (
      SELECT COALESCE(l."title", p."slug"), l."content"
      FROM (SELECT 1) AS one
      LEFT JOIN LATERAL (
        SELECT "title", "content" FROM "posts_locales"
        WHERE "_parent_id" = p."id"
        ORDER BY ("_locale" = ${DEFAULT_CMS_LOCALE}::"_locales") DESC, "id"
        LIMIT 1
      ) AS l ON true
    );
  `)

  await db.execute(sql`
    ALTER TABLE "posts" ALTER COLUMN "title" SET NOT NULL;

    DROP INDEX IF EXISTS "posts_tenant_environment_status_idx";
    DROP INDEX IF EXISTS "posts_published_at_idx";
    DROP INDEX IF EXISTS "posts_status_idx";
    DROP INDEX IF EXISTS "posts_slug_idx";

    ALTER TABLE "posts" ALTER COLUMN "published_at" DROP NOT NULL;
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "status";

    DROP TABLE IF EXISTS "posts_locales";
    DROP TYPE IF EXISTS "enum_posts_status";
  `)
}

async function postsHasColumn({
  column,
  db,
}: {
  column: string
  db: MigrateUpArgs['db']
}): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'posts' AND column_name = ${column};
  `)
  return result.rows.length > 0
}
