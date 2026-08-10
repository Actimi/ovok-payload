import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * Localized `release-notes` and `legal-pages` collections
 * (carehub-product-roadmap#895) plus the `_locales` enum introduced by
 * enabling Payload localization (de/en). SQL matches the drizzle-pushed
 * schema for payload.config.ts, including drizzle's generated index names
 * (tenant_environment_slug_3/4, tenant_environment_status_1/2), so future
 * schema diffs stay clean. Idempotent like the other migrations here.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "_locales" AS ENUM('de', 'en');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_release_notes_environment" AS ENUM('dev', 'staging', 'prod');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_release_notes_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_release_notes_tags" AS ENUM('announcement', 'new', 'improved', 'fixed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_legal_pages_environment" AS ENUM('dev', 'staging', 'prod');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_legal_pages_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS "release_notes" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "environment" "enum_release_notes_environment" DEFAULT 'dev' NOT NULL,
      "slug" varchar,
      "status" "enum_release_notes_status" DEFAULT 'draft' NOT NULL,
      "published_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "release_notes_locales" (
      "title" varchar NOT NULL,
      "excerpt" varchar,
      "body" jsonb,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "release_notes_tags" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum_release_notes_tags",
      "id" serial PRIMARY KEY NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "legal_pages" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "environment" "enum_legal_pages_environment" DEFAULT 'dev' NOT NULL,
      "slug" varchar NOT NULL,
      "status" "enum_legal_pages_status" DEFAULT 'draft' NOT NULL,
      "effective_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "legal_pages_locales" (
      "title" varchar NOT NULL,
      "body" jsonb,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "release_notes"
        ADD CONSTRAINT "release_notes_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "release_notes_locales"
        ADD CONSTRAINT "release_notes_locales_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."release_notes"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "release_notes_tags"
        ADD CONSTRAINT "release_notes_tags_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."release_notes"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "legal_pages"
        ADD CONSTRAINT "legal_pages_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "legal_pages_locales"
        ADD CONSTRAINT "legal_pages_locales_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "release_notes_tenant_idx" ON "release_notes" ("tenant_id");
    CREATE INDEX IF NOT EXISTS "release_notes_environment_idx" ON "release_notes" ("environment");
    CREATE INDEX IF NOT EXISTS "release_notes_slug_idx" ON "release_notes" ("slug");
    CREATE INDEX IF NOT EXISTS "release_notes_status_idx" ON "release_notes" ("status");
    CREATE INDEX IF NOT EXISTS "release_notes_published_at_idx" ON "release_notes" ("published_at");
    CREATE INDEX IF NOT EXISTS "release_notes_updated_at_idx" ON "release_notes" ("updated_at");
    CREATE INDEX IF NOT EXISTS "release_notes_created_at_idx" ON "release_notes" ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "tenant_environment_slug_3_idx" ON "release_notes" ("tenant_id", "environment", "slug");
    CREATE INDEX IF NOT EXISTS "tenant_environment_status_1_idx" ON "release_notes" ("tenant_id", "environment", "status");

    CREATE UNIQUE INDEX IF NOT EXISTS "release_notes_locales_locale_parent_id_unique" ON "release_notes_locales" ("_locale", "_parent_id");

    CREATE INDEX IF NOT EXISTS "release_notes_tags_order_idx" ON "release_notes_tags" ("order");
    CREATE INDEX IF NOT EXISTS "release_notes_tags_parent_idx" ON "release_notes_tags" ("parent_id");

    CREATE INDEX IF NOT EXISTS "legal_pages_tenant_idx" ON "legal_pages" ("tenant_id");
    CREATE INDEX IF NOT EXISTS "legal_pages_environment_idx" ON "legal_pages" ("environment");
    CREATE INDEX IF NOT EXISTS "legal_pages_slug_idx" ON "legal_pages" ("slug");
    CREATE INDEX IF NOT EXISTS "legal_pages_status_idx" ON "legal_pages" ("status");
    CREATE INDEX IF NOT EXISTS "legal_pages_updated_at_idx" ON "legal_pages" ("updated_at");
    CREATE INDEX IF NOT EXISTS "legal_pages_created_at_idx" ON "legal_pages" ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "tenant_environment_slug_4_idx" ON "legal_pages" ("tenant_id", "environment", "slug");
    CREATE INDEX IF NOT EXISTS "tenant_environment_status_2_idx" ON "legal_pages" ("tenant_id", "environment", "status");

    CREATE UNIQUE INDEX IF NOT EXISTS "legal_pages_locales_locale_parent_id_unique" ON "legal_pages_locales" ("_locale", "_parent_id");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "release_notes_id" integer,
      ADD COLUMN IF NOT EXISTS "legal_pages_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_release_notes_fk"
        FOREIGN KEY ("release_notes_id") REFERENCES "public"."release_notes"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_legal_pages_fk"
        FOREIGN KEY ("legal_pages_id") REFERENCES "public"."legal_pages"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_release_notes_id_idx" ON "payload_locked_documents_rels" ("release_notes_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_legal_pages_id_idx" ON "payload_locked_documents_rels" ("legal_pages_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_release_notes_fk",
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_legal_pages_fk",
      DROP COLUMN IF EXISTS "release_notes_id",
      DROP COLUMN IF EXISTS "legal_pages_id";

    DROP TABLE IF EXISTS "release_notes_locales";
    DROP TABLE IF EXISTS "release_notes_tags";
    DROP TABLE IF EXISTS "release_notes";
    DROP TABLE IF EXISTS "legal_pages_locales";
    DROP TABLE IF EXISTS "legal_pages";

    DROP TYPE IF EXISTS "enum_release_notes_environment";
    DROP TYPE IF EXISTS "enum_release_notes_status";
    DROP TYPE IF EXISTS "enum_release_notes_tags";
    DROP TYPE IF EXISTS "enum_legal_pages_environment";
    DROP TYPE IF EXISTS "enum_legal_pages_status";
    DROP TYPE IF EXISTS "_locales";
  `)
}
