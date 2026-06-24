CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "medplum_project_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_unique" ON "projects" ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "projects_medplum_project_id_unique" ON "projects" ("medplum_project_id");

CREATE TABLE IF NOT EXISTS "project_environments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "environment" text NOT NULL,
  "status" text NOT NULL,
  "enabled_at" timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_environments_project_environment_unique"
  ON "project_environments" ("project_id", "environment");
