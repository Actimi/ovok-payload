import { CreateProjectSchema, EnableEnvironmentSchema, type Environment } from '@ovok/contracts'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import { db } from '../db/index.js'
import { projectEnvironments, projects } from '../db/schema.js'
import { provisionPayloadTenant } from '../services/provisioning.js'

export const projectsRouter = new Hono()

projectsRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = CreateProjectSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }

  const [project] = await db
    .insert(projects)
    .values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      medplumProjectId: parsed.data.medplumProjectId,
    })
    .returning()

  return c.json({ project }, 201)
})

projectsRouter.get('/', async (c) => {
  const rows = await db.select().from(projects).orderBy(projects.createdAt)
  return c.json({ projects: rows })
})

projectsRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1)

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const environments = await db
    .select()
    .from(projectEnvironments)
    .where(eq(projectEnvironments.projectId, project.id))

  return c.json({ ...project, environments })
})

projectsRouter.get('/:slug/environments', async (c) => {
  const slug = c.req.param('slug')
  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1)

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const environments = await db
    .select()
    .from(projectEnvironments)
    .where(eq(projectEnvironments.projectId, project.id))

  return c.json({ slug: project.slug, environments })
})

projectsRouter.post('/:slug/environments', async (c) => {
  const slug = c.req.param('slug')
  const body = await c.req.json().catch(() => null)
  const parsed = EnableEnvironmentSchema.safeParse(body)

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }

  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const environment = parsed.data.environment

  const existing = await db
    .select()
    .from(projectEnvironments)
    .where(eq(projectEnvironments.projectId, project.id))

  const match = existing.find((row) => row.environment === environment)

  if (match?.status === 'active') {
    return c.json({ environment: match, provisioned: false })
  }

  let row = match

  if (!row) {
    ;[row] = await db
      .insert(projectEnvironments)
      .values({
        environment,
        projectId: project.id,
        status: 'provisioning',
      })
      .returning()
  } else if (row.status !== 'provisioning') {
    ;[row] = await db
      .update(projectEnvironments)
      .set({ enabledAt: null, status: 'provisioning' })
      .where(eq(projectEnvironments.id, row.id))
      .returning()
  }

  try {
    await provisionPayloadTenant({
      slug: project.slug,
      active: true,
      medplumProjectId: project.medplumProjectId,
    })
    ;[row] = await db
      .update(projectEnvironments)
      .set({ enabledAt: new Date(), status: 'active' })
      .where(eq(projectEnvironments.id, row.id))
      .returning()
  } catch (error) {
    await db
      .update(projectEnvironments)
      .set({ status: 'suspended' })
      .where(eq(projectEnvironments.id, row.id))

    return c.json(
      {
        error: 'Provisioning failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      502,
    )
  }

  return c.json({ environment: row, provisioned: true }, 201)
})

projectsRouter.delete('/:slug/environments/:env', async (c) => {
  const slug = c.req.param('slug')
  const environment = c.req.param('env')

  const envParsed = z.enum(['dev', 'staging', 'prod']).safeParse(environment)
  if (!envParsed.success) {
    return c.json({ error: 'Invalid environment' }, 400)
  }

  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const rows = await db
    .select()
    .from(projectEnvironments)
    .where(eq(projectEnvironments.projectId, project.id))

  const match = rows.find((row) => row.environment === envParsed.data)
  if (!match) {
    return c.json({ error: 'Environment not enabled for project' }, 404)
  }

  const [suspended] = await db
    .update(projectEnvironments)
    .set({ enabledAt: null, status: 'suspended' })
    .where(eq(projectEnvironments.id, match.id))
    .returning()

  return c.json({ environment: suspended })
})
