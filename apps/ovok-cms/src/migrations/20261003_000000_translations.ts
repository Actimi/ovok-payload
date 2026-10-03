import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * The localized `translations` collection: UI strings apps and the Ovok SDKs
 * read, one document per group, with `strings` rows whose `value` is
 * localized. SQL matches the drizzle-pushed schema for payload.config.ts,
 * including drizzle's generated index names (tenant_environment_slug_5,
 * tenant_environment_status_3), so future schema diffs stay clean. Idempotent
 * like the other migrations here. `_locales` already exists (20260806/0807).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_translations_environment" AS ENUM('dev', 'staging', 'prod');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_translations_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS "translations" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "environment" "enum_translations_environment" DEFAULT 'dev' NOT NULL,
      "slug" varchar NOT NULL,
      "title" varchar NOT NULL,
      "status" "enum_translations_status" DEFAULT 'draft' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "translations_strings" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "translations_strings_locales" (
      "value" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "translations"
        ADD CONSTRAINT "translations_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "translations_strings"
        ADD CONSTRAINT "translations_strings_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."translations"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "translations_strings_locales"
        ADD CONSTRAINT "translations_strings_locales_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."translations_strings"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "translations_tenant_idx" ON "translations" ("tenant_id");
    CREATE INDEX IF NOT EXISTS "translations_environment_idx" ON "translations" ("environment");
    CREATE INDEX IF NOT EXISTS "translations_slug_idx" ON "translations" ("slug");
    CREATE INDEX IF NOT EXISTS "translations_status_idx" ON "translations" ("status");
    CREATE INDEX IF NOT EXISTS "translations_updated_at_idx" ON "translations" ("updated_at");
    CREATE INDEX IF NOT EXISTS "translations_created_at_idx" ON "translations" ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "tenant_environment_slug_5_idx" ON "translations" ("tenant_id", "environment", "slug");
    CREATE INDEX IF NOT EXISTS "tenant_environment_status_3_idx" ON "translations" ("tenant_id", "environment", "status");

    CREATE INDEX IF NOT EXISTS "translations_strings_order_idx" ON "translations_strings" ("_order");
    CREATE INDEX IF NOT EXISTS "translations_strings_parent_id_idx" ON "translations_strings" ("_parent_id");

    CREATE UNIQUE INDEX IF NOT EXISTS "translations_strings_locales_locale_parent_id_unique" ON "translations_strings_locales" ("_locale", "_parent_id");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "translations_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_translations_fk"
        FOREIGN KEY ("translations_id") REFERENCES "public"."translations"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_translations_id_idx" ON "payload_locked_documents_rels" ("translations_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_translations_fk",
      DROP COLUMN IF EXISTS "translations_id";

    DROP TABLE IF EXISTS "translations_strings_locales";
    DROP TABLE IF EXISTS "translations_strings";
    DROP TABLE IF EXISTS "translations";

    DROP TYPE IF EXISTS "enum_translations_environment";
    DROP TYPE IF EXISTS "enum_translations_status";
  `)
}
