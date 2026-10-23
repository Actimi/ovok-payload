import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * The system tenant and the platform records it holds: localized `email-templates`
 * for SaaS mail, and every project's `notifications` with their per-person
 * `notification-reads`. `tenants.kind` tells the system tenant from a project's,
 * which alone has a `medplum_project_id`. SQL matches the drizzle-pushed schema,
 * including drizzle's index names (tenant_environment_slug_6, medplumProjectId_createdAt,
 * notificationId_userId). Idempotent like the other migrations here.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_tenants_kind" AS ENUM('project', 'system');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_email_templates_environment" AS ENUM('dev', 'staging', 'prod');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_notifications_environment" AS ENUM('dev', 'staging', 'prod');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_notifications_severity" AS ENUM('info', 'warning', 'error');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE "enum_notification_reads_environment" AS ENUM('dev', 'staging', 'prod');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "kind" "enum_tenants_kind" DEFAULT 'project' NOT NULL;
    ALTER TABLE "tenants" ALTER COLUMN "medplum_project_id" DROP NOT NULL;
    CREATE INDEX IF NOT EXISTS "tenants_kind_idx" ON "tenants" ("kind");

    INSERT INTO "tenants" ("slug", "kind", "active", "updated_at", "created_at")
      VALUES ('_system', 'system', true, now(), now())
      ON CONFLICT ("slug") DO NOTHING;

    CREATE TABLE IF NOT EXISTS "email_templates" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "environment" "enum_email_templates_environment" DEFAULT 'dev' NOT NULL,
      "slug" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "email_templates_locales" (
      "subject" varchar NOT NULL,
      "html" varchar NOT NULL,
      "text" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "environment" "enum_notifications_environment" DEFAULT 'dev' NOT NULL,
      "medplum_project_id" varchar NOT NULL,
      "kind" varchar NOT NULL,
      "severity" "enum_notifications_severity" DEFAULT 'info' NOT NULL,
      "title" varchar NOT NULL,
      "body" varchar,
      "data" jsonb,
      "audience" varchar DEFAULT 'admins' NOT NULL,
      "dedup_key" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "notification_reads" (
      "id" serial PRIMARY KEY NOT NULL,
      "tenant_id" integer,
      "environment" "enum_notification_reads_environment" DEFAULT 'dev' NOT NULL,
      "notification_id" numeric NOT NULL,
      "user_id" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "email_templates"
        ADD CONSTRAINT "email_templates_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "email_templates_locales"
        ADD CONSTRAINT "email_templates_locales_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."email_templates"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "notifications"
        ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "notification_reads"
        ADD CONSTRAINT "notification_reads_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "email_templates_tenant_idx" ON "email_templates" ("tenant_id");
    CREATE INDEX IF NOT EXISTS "email_templates_environment_idx" ON "email_templates" ("environment");
    CREATE INDEX IF NOT EXISTS "email_templates_slug_idx" ON "email_templates" ("slug");
    CREATE INDEX IF NOT EXISTS "email_templates_updated_at_idx" ON "email_templates" ("updated_at");
    CREATE INDEX IF NOT EXISTS "email_templates_created_at_idx" ON "email_templates" ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "tenant_environment_slug_6_idx" ON "email_templates" ("tenant_id", "environment", "slug");
    CREATE UNIQUE INDEX IF NOT EXISTS "email_templates_locales_locale_parent_id_unique" ON "email_templates_locales" ("_locale", "_parent_id");

    CREATE INDEX IF NOT EXISTS "notifications_tenant_idx" ON "notifications" ("tenant_id");
    CREATE INDEX IF NOT EXISTS "notifications_environment_idx" ON "notifications" ("environment");
    CREATE INDEX IF NOT EXISTS "notifications_medplum_project_id_idx" ON "notifications" ("medplum_project_id");
    CREATE INDEX IF NOT EXISTS "notifications_kind_idx" ON "notifications" ("kind");
    CREATE UNIQUE INDEX IF NOT EXISTS "notifications_dedup_key_idx" ON "notifications" ("dedup_key");
    CREATE INDEX IF NOT EXISTS "notifications_updated_at_idx" ON "notifications" ("updated_at");
    CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");
    CREATE INDEX IF NOT EXISTS "medplumProjectId_createdAt_idx" ON "notifications" ("medplum_project_id", "created_at");

    CREATE INDEX IF NOT EXISTS "notification_reads_tenant_idx" ON "notification_reads" ("tenant_id");
    CREATE INDEX IF NOT EXISTS "notification_reads_environment_idx" ON "notification_reads" ("environment");
    CREATE INDEX IF NOT EXISTS "notification_reads_notification_id_idx" ON "notification_reads" ("notification_id");
    CREATE INDEX IF NOT EXISTS "notification_reads_updated_at_idx" ON "notification_reads" ("updated_at");
    CREATE INDEX IF NOT EXISTS "notification_reads_created_at_idx" ON "notification_reads" ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "notificationId_userId_idx" ON "notification_reads" ("notification_id", "user_id");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "email_templates_id" integer,
      ADD COLUMN IF NOT EXISTS "notifications_id" integer,
      ADD COLUMN IF NOT EXISTS "notification_reads_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_email_templates_fk"
        FOREIGN KEY ("email_templates_id") REFERENCES "public"."email_templates"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk"
        FOREIGN KEY ("notifications_id") REFERENCES "public"."notifications"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_notification_reads_fk"
        FOREIGN KEY ("notification_reads_id") REFERENCES "public"."notification_reads"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_email_templates_id_idx" ON "payload_locked_documents_rels" ("email_templates_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_notifications_id_idx" ON "payload_locked_documents_rels" ("notifications_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_notification_reads_id_idx" ON "payload_locked_documents_rels" ("notification_reads_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_email_templates_fk",
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_notifications_fk",
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_notification_reads_fk",
      DROP COLUMN IF EXISTS "email_templates_id",
      DROP COLUMN IF EXISTS "notifications_id",
      DROP COLUMN IF EXISTS "notification_reads_id";

    DROP TABLE IF EXISTS "notification_reads";
    DROP TABLE IF EXISTS "notifications";
    DROP TABLE IF EXISTS "email_templates_locales";
    DROP TABLE IF EXISTS "email_templates";

    DELETE FROM "tenants" WHERE "kind" = 'system';
    DROP INDEX IF EXISTS "tenants_kind_idx";
    ALTER TABLE "tenants" ALTER COLUMN "medplum_project_id" SET NOT NULL;
    ALTER TABLE "tenants" DROP COLUMN IF EXISTS "kind";

    DROP TYPE IF EXISTS "enum_notification_reads_environment";
    DROP TYPE IF EXISTS "enum_notifications_severity";
    DROP TYPE IF EXISTS "enum_notifications_environment";
    DROP TYPE IF EXISTS "enum_email_templates_environment";
    DROP TYPE IF EXISTS "enum_tenants_kind";
  `)
}
