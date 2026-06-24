import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    medplumProjectId: uuid('medplum_project_id').notNull(),
  },
  (table) => ({
    medplumUnique: uniqueIndex('projects_medplum_project_id_unique').on(table.medplumProjectId),
    slugUnique: uniqueIndex('projects_slug_unique').on(table.slug),
  }),
)

export const projectEnvironments = pgTable(
  'project_environments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    enabledAt: timestamp('enabled_at', { withTimezone: true }),
    environment: text('environment').notNull(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
  },
  (table) => ({
    projectEnvironmentUnique: uniqueIndex('project_environments_project_environment_unique').on(
      table.projectId,
      table.environment,
    ),
  }),
)

export type Project = typeof projects.$inferSelect
export type ProjectEnvironment = typeof projectEnvironments.$inferSelect
