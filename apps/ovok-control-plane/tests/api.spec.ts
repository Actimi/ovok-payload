import {
  CreateProjectSchema,
  EnableEnvironmentSchema,
  provisionTenantSchema,
} from '@ovok/contracts'
import { describe, expect, it } from 'vitest'

import { provisionTenantUrl } from '../src/services/provisioning.js'

describe('control plane schemas', () => {
  it('validates create project input', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'Test',
      slug: 'test-project',
      medplumProjectId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid slug', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'Test',
      slug: 'Invalid Slug!',
      medplumProjectId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('validates enable environment input', () => {
    expect(EnableEnvironmentSchema.safeParse({ environment: 'dev' }).success).toBe(true)
    expect(EnableEnvironmentSchema.safeParse({ environment: 'qa' }).success).toBe(false)
  })

  it('validates provision tenant input', () => {
    expect(
      provisionTenantSchema.safeParse({
        slug: 'test',
        medplumProjectId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true)
  })

  it('builds CMS provision URL with /api prefix', () => {
    expect(provisionTenantUrl('http://localhost:3000')).toBe(
      'http://localhost:3000/api/_ovok/tenants/provision',
    )
    expect(provisionTenantUrl('http://localhost:3000/')).toBe(
      'http://localhost:3000/api/_ovok/tenants/provision',
    )
  })
})

describe('control plane app', () => {
  it('rejects unauthenticated project list', async () => {
    const { app } = await import('../src/app.js')
    const response = await app.request('/v1/projects')
    expect(response.status).toBe(401)
  })

  it('returns health without auth', async () => {
    const { app } = await import('../src/app.js')
    const response = await app.request('/health')
    expect(response.status).toBeLessThan(600)
  })
})
