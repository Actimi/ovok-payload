import type { Payload } from 'payload'

import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '../src/payload.config'
import { createTestTenant, deleteTestTenant, hasDatabase, proxyReq } from './helpers'

describe.skipIf(!hasDatabase)('ovok-cms environment isolation', () => {
  let payload: Payload
  let tenantId: string
  const createdContentTypeIDs: Array<number | string> = []

  beforeAll(async () => {
    payload = await getPayload({ config })
    tenantId = await createTestTenant(payload, 'test-env')
  })

  afterAll(async () => {
    for (const id of createdContentTypeIDs) {
      await payload.delete({ id, collection: 'content-types', overrideAccess: true })
    }
    createdContentTypeIDs.length = 0

    if (payload && tenantId) {
      await deleteTestTenant(payload, tenantId)
    }
    if (payload) {
      await payload.destroy()
    }
  })

  it('keeps dev content invisible in staging queries', async () => {
    const contentType = await payload.create({
      collection: 'content-types',
      data: {
        name: 'Landing',
        slug: `landing-${Date.now()}`,
        fields: [],
        pluralName: 'Landings',
      },
      req: proxyReq(tenantId, 'dev'),
    })

    createdContentTypeIDs.push(contentType.id)

    const devResults = await payload.find({
      collection: 'content-types',
      req: proxyReq(tenantId, 'dev'),
      where: { id: { equals: contentType.id } },
    })

    expect(devResults.totalDocs).toBe(1)

    const stagingResults = await payload.find({
      collection: 'content-types',
      req: proxyReq(tenantId, 'staging'),
      where: { id: { equals: contentType.id } },
    })

    expect(stagingResults.totalDocs).toBe(0)
  })
})

describe('ovok-cms migrations', () => {
  it('exports committed prod migrations', async () => {
    const { migrations } = await import('../src/migrations/index')
    expect(migrations.length).toBeGreaterThanOrEqual(2)
    expect(migrations.map((m) => m.name)).toContain('20250624_000000_initial')
    expect(migrations.map((m) => m.name)).toContain('20250624_120000_add_environment')
  })
})
