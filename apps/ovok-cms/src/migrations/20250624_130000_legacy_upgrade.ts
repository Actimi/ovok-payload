import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * Idempotent upgrade for databases bootstrapped before content-types/items
 * (legacy payload_migrations name: 20260515_193618_initial).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_content_items_environment" AS ENUM('dev', 'staging', 'prod');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_content_items_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_content_types_environment" AS ENUM('dev', 'staging', 'prod');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_media_environment" AS ENUM('dev', 'staging', 'prod');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_posts_environment" AS ENUM('dev', 'staging', 'prod');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "environment" "enum_media_environment" DEFAULT 'dev' NOT NULL;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "prefix" varchar DEFAULT 'media';
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "environment" "enum_posts_environment" DEFAULT 'dev' NOT NULL;

    CREATE TABLE IF NOT EXISTS "content_types" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "environment" "enum_content_types_environment" DEFAULT 'dev' NOT NULL,
      "name" varchar NOT NULL,
      "plural_name" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "description" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "content_types_fields" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL,
      "label" varchar NOT NULL,
      "type" varchar NOT NULL,
      "required" boolean DEFAULT false,
      "unique" boolean DEFAULT false,
      "has_many" boolean DEFAULT false,
      "description" varchar,
      "relation_to" varchar,
      "localized" boolean DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS "content_types_fields_options" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "value" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "content_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "environment" "enum_content_items_environment" DEFAULT 'dev' NOT NULL,
      "content_type_id" integer NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar,
      "status" "enum_content_items_status" DEFAULT 'draft' NOT NULL,
      "data" jsonb NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "content_types" ADD CONSTRAINT "content_types_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "content_types_fields" ADD CONSTRAINT "content_types_fields_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."content_types"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "content_types_fields_options" ADD CONSTRAINT "content_types_fields_options_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."content_types_fields"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "content_items" ADD CONSTRAINT "content_items_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "content_items" ADD CONSTRAINT "content_items_content_type_id_content_types_id_fk"
        FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "media_environment_idx" ON "media" USING btree ("environment");
    CREATE INDEX IF NOT EXISTS "posts_environment_idx" ON "posts" USING btree ("environment");
    CREATE UNIQUE INDEX IF NOT EXISTS "content_types_tenant_environment_slug_idx"
      ON "content_types" USING btree ("tenant_id", "environment", "slug");
    CREATE INDEX IF NOT EXISTS "content_types_tenant_environment_idx"
      ON "content_types" USING btree ("tenant_id", "environment");
    CREATE UNIQUE INDEX IF NOT EXISTS "content_items_tenant_environment_slug_idx"
      ON "content_items" USING btree ("tenant_id", "environment", "slug");
    CREATE INDEX IF NOT EXISTS "content_items_tenant_environment_status_idx"
      ON "content_items" USING btree ("tenant_id", "environment", "status");
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

    CREATE UNIQUE INDEX IF NOT EXISTS "posts_tenant_environment_slug_idx"
      ON "posts" USING btree ("tenant_id", "environment", "slug");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "content_items" CASCADE;
    DROP TABLE IF EXISTS "content_types_fields_options" CASCADE;
    DROP TABLE IF EXISTS "content_types_fields" CASCADE;
    DROP TABLE IF EXISTS "content_types" CASCADE;
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "environment";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "environment";
  `)
}
