import { z } from 'zod'

import { EnvironmentSchema } from './environment.js'

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  medplumProjectId: z.string().uuid(),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>

export const EnableEnvironmentSchema = z.object({
  environment: EnvironmentSchema,
})

export type EnableEnvironmentInput = z.infer<typeof EnableEnvironmentSchema>

export const ProvisionTenantSchema = z.object({
  slug: z.string().min(1),
  active: z.boolean().default(true),
  medplumProjectId: z.string().uuid(),
})

export type ProvisionTenantInput = z.infer<typeof ProvisionTenantSchema>

/** camelCase alias used by CMS provisioning endpoint */
export const provisionTenantSchema = ProvisionTenantSchema

export const ProjectEnvironmentStatusSchema = z.enum(['provisioning', 'active', 'suspended'])

export type ProjectEnvironmentStatus = z.infer<typeof ProjectEnvironmentStatusSchema>

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string().datetime(),
  medplumProjectId: z.string().uuid(),
})

export const ProjectEnvironmentSchema = z.object({
  id: z.string().uuid(),
  enabledAt: z.string().datetime().nullable(),
  environment: EnvironmentSchema,
  projectId: z.string().uuid(),
  status: ProjectEnvironmentStatusSchema,
})

export const ProjectDetailSchema = ProjectSchema.extend({
  environments: z.array(ProjectEnvironmentSchema),
})
