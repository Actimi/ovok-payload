import type { Payload } from 'payload'

import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  OVOK_ENVIRONMENT_HEADER,
  OVOK_INTERNAL_KEY_HEADER,
  OVOK_TENANT_HEADER,
} from '../src/access/ovokInternal'
import config from '../src/payload.config'

const hasDatabase = Boolean(process.env.DATABASE_URI || process.env.DATABASE_URL)

const internalHeaders = (tenantId: string, environment: string) => ({
  [OVOK_ENVIRONMENT_HEADER]: environment,
  [OVOK_INTERNAL_KEY_HEADER]: process.env.PAYLOAD_INTERNAL_API_KEY ?? 'test-internal-key',
  [OVOK_TENANT_HEADER]: tenantId,
})

describe.skipIf(!hasDatabase)('ovok-cms environment isolation', () => {
  let payload: Payload
  let tenantId: string
  const createdContentTypeIDs: Array<number | string> = []

  beforeAll(async () => {
    payload = await getPayload({ config })

    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        slug: `test-${Date.now()}`,
        active: true,
        medplumProjectId: `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`,
      },
      overrideAccess: true,
    })

    tenantId = String(tenant.id)
  })

  afterAll(async () => {
    for (const id of createdContentTypeIDs) {
      await payload.delete({ id, collection: 'content-types', overrideAccess: true })
    }
    createdContentTypeIDs.length = 0

    if (payload && tenantId) {
      await payload.delete({ id: tenantId, collection: 'tenants', overrideAccess: true })
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
      req: {
        headers: new Headers(internalHeaders(tenantId, 'dev')),
        user: {
          id: `ovok-proxy:${tenantId}`,
          collection: 'users',
          email: 'proxy@ovok.local',
          tenants: [{ tenant: tenantId }],
        },
      } as any,
    })

    createdContentTypeIDs.push(contentType.id)

    const devResults = await payload.find({
      collection: 'content-types',
      req: {
        headers: new Headers(internalHeaders(tenantId, 'dev')),
        user: {
          id: `ovok-proxy:${tenantId}`,
          collection: 'users',
          email: 'proxy@ovok.local',
          tenants: [{ tenant: tenantId }],
        },
      } as any,
      where: { id: { equals: contentType.id } },
    })

    expect(devResults.totalDocs).toBe(1)

    const stagingResults = await payload.find({
      collection: 'content-types',
      req: {
        headers: new Headers(internalHeaders(tenantId, 'staging')),
        user: {
          id: `ovok-proxy:${tenantId}`,
          collection: 'users',
          email: 'proxy@ovok.local',
          tenants: [{ tenant: tenantId }],
        },
      } as any,
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
