import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * Localized `banners` collection (carehub-product-roadmap#1705): a customer
 * announcement shown in the dashboard for a configurable [startDate, endDate]
 * window. Same localized title + rich-text body as a legal page, plus the two
 * non-localized window columns. `_locales` already exists (locales_all_iso) and
 * is left untouched. Idempotent like the other migrations here.
 *
 * Index naming note: the shared `tenant_environment_slug_N` / `_status_N`
 * counters that drizzle generates differ between a dev push (which has every
 * collection) and this migration lineage (which has fewer). In the migration
 * lineage the counters `slug_5` and `status_4` are the next ones a dev push
 * assigns banners, but `slug_5` is already taken here by the `translations`
 * migration, so the unique slug index uses the next free counter (`slug_7`) to
 * avoid an `IF NOT EXISTS` no-op that would silently skip it. `status_4` is free
 * and matches the push. The names are cosmetic — each index enforces the same
 * (tenant, environment, slug/status) shape regardless.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_banners_environment" AS ENUM('dev', 'staging', 'prod');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_banners_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS "banners" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "environment" "enum_banners_environment" DEFAULT 'dev' NOT NULL,
      "slug" varchar,
      "start_date" timestamp(3) with time zone NOT NULL,
      "end_date" timestamp(3) with time zone NOT NULL,
      "status" "enum_banners_status" DEFAULT 'draft' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "banners_locales" (
      "title" varchar NOT NULL,
      "body" jsonb,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "banners"
        ADD CONSTRAINT "banners_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "banners_locales"
        ADD CONSTRAINT "banners_locales_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."banners"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "banners_tenant_idx" ON "banners" ("tenant_id");
    CREATE INDEX IF NOT EXISTS "banners_environment_idx" ON "banners" ("environment");
    CREATE INDEX IF NOT EXISTS "banners_slug_idx" ON "banners" ("slug");
    CREATE INDEX IF NOT EXISTS "banners_status_idx" ON "banners" ("status");
    CREATE INDEX IF NOT EXISTS "banners_updated_at_idx" ON "banners" ("updated_at");
    CREATE INDEX IF NOT EXISTS "banners_created_at_idx" ON "banners" ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "tenant_environment_slug_7_idx" ON "banners" ("tenant_id", "environment", "slug");
    CREATE INDEX IF NOT EXISTS "tenant_environment_status_4_idx" ON "banners" ("tenant_id", "environment", "status");

    CREATE UNIQUE INDEX IF NOT EXISTS "banners_locales_locale_parent_id_unique" ON "banners_locales" ("_locale", "_parent_id");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "banners_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_banners_fk"
        FOREIGN KEY ("banners_id") REFERENCES "public"."banners"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_banners_id_idx" ON "payload_locked_documents_rels" ("banners_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_banners_fk",
      DROP COLUMN IF EXISTS "banners_id";

    DROP TABLE IF EXISTS "banners_locales";
    DROP TABLE IF EXISTS "banners";

    DROP TYPE IF EXISTS "enum_banners_environment";
    DROP TYPE IF EXISTS "enum_banners_status";
  `)
}
