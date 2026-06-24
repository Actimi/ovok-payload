/**
 * Initial schema migration for ovok-cms.
 *
 * Generated manually to bootstrap production deployments. After schema changes,
 * run `pnpm migrate:create` against a dev database to append new migrations.
 *
 * Covers: tenants, users, media, posts, content-types, content-items,
 * multi-tenant fields, environment fields, and composite indexes.
 */
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "enum_content_items_environment" AS ENUM('dev', 'staging', 'prod');
    CREATE TYPE "enum_content_items_status" AS ENUM('draft', 'published');
    CREATE TYPE "enum_content_types_environment" AS ENUM('dev', 'staging', 'prod');
    CREATE TYPE "enum_media_environment" AS ENUM('dev', 'staging', 'prod');
    CREATE TYPE "enum_posts_environment" AS ENUM('dev', 'staging', 'prod');

    CREATE TABLE "tenants" (
      "id" serial PRIMARY KEY NOT NULL,
      "medplum_project_id" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "active" boolean DEFAULT true,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE "users" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE "media" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "environment" "enum_media_environment" DEFAULT 'dev' NOT NULL,
      "alt" varchar,
      "prefix" varchar DEFAULT 'media',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric
    );

    CREATE TABLE "posts" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "environment" "enum_posts_environment" DEFAULT 'dev' NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "content" jsonb,
      "media_id" integer,
      "published_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE "content_types" (
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

    CREATE TABLE "content_types_fields" (
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

    CREATE TABLE "content_types_fields_options" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "value" varchar NOT NULL
    );

    CREATE TABLE "content_items" (
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

    CREATE TABLE "payload_kv" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL,
      "data" jsonb NOT NULL
    );

    CREATE TABLE "payload_locked_documents" (
      "id" serial PRIMARY KEY NOT NULL,
      "global_slug" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE "payload_locked_documents_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "tenants_id" integer,
      "users_id" integer,
      "media_id" integer,
      "posts_id" integer,
      "content_types_id" integer,
      "content_items_id" integer
    );

    CREATE TABLE "payload_preferences" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar,
      "value" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE "payload_preferences_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "users_id" integer
    );

    CREATE TABLE "payload_migrations" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar,
      "batch" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "posts" ADD CONSTRAINT "posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "posts" ADD CONSTRAINT "posts_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "content_types" ADD CONSTRAINT "content_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "content_types_fields" ADD CONSTRAINT "content_types_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_types"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "content_types_fields_options" ADD CONSTRAINT "content_types_fields_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_types_fields"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "content_items" ADD CONSTRAINT "content_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "content_items" ADD CONSTRAINT "content_items_content_type_id_content_types_id_fk" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;

    CREATE UNIQUE INDEX "tenants_medplum_project_id_idx" ON "tenants" USING btree ("medplum_project_id");
    CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");
    CREATE INDEX "media_tenant_idx" ON "media" USING btree ("tenant_id");
    CREATE INDEX "media_environment_idx" ON "media" USING btree ("environment");
    CREATE UNIQUE INDEX "content_types_tenant_environment_slug_idx" ON "content_types" USING btree ("tenant_id", "environment", "slug");
    CREATE INDEX "content_types_tenant_environment_idx" ON "content_types" USING btree ("tenant_id", "environment");
    CREATE UNIQUE INDEX "content_items_tenant_environment_slug_idx" ON "content_items" USING btree ("tenant_id", "environment", "slug");
    CREATE INDEX "content_items_tenant_environment_status_idx" ON "content_items" USING btree ("tenant_id", "environment", "status");
    CREATE UNIQUE INDEX "posts_tenant_environment_slug_idx" ON "posts" USING btree ("tenant_id", "environment", "slug");
    CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "payload_migrations" CASCADE;
    DROP TABLE IF EXISTS "payload_preferences_rels" CASCADE;
    DROP TABLE IF EXISTS "payload_preferences" CASCADE;
    DROP TABLE IF EXISTS "payload_locked_documents_rels" CASCADE;
    DROP TABLE IF EXISTS "payload_locked_documents" CASCADE;
    DROP TABLE IF EXISTS "payload_kv" CASCADE;
    DROP TABLE IF EXISTS "content_items" CASCADE;
    DROP TABLE IF EXISTS "content_types_fields_options" CASCADE;
    DROP TABLE IF EXISTS "content_types_fields" CASCADE;
    DROP TABLE IF EXISTS "content_types" CASCADE;
    DROP TABLE IF EXISTS "posts" CASCADE;
    DROP TABLE IF EXISTS "media" CASCADE;
    DROP TABLE IF EXISTS "users" CASCADE;
    DROP TABLE IF EXISTS "tenants" CASCADE;
    DROP TYPE IF EXISTS "enum_content_items_environment";
    DROP TYPE IF EXISTS "enum_content_items_status";
    DROP TYPE IF EXISTS "enum_content_types_environment";
    DROP TYPE IF EXISTS "enum_media_environment";
    DROP TYPE IF EXISTS "enum_posts_environment";
  `)
}
