import type { Payload } from 'payload'

import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  OVOK_ENVIRONMENT_HEADER,
  OVOK_INTERNAL_KEY_HEADER,
  OVOK_TENANT_HEADER,
} from '../src/access/ovokInternal'
import config from '../src/payload.config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const hasDatabase = Boolean(process.env.DATABASE_URI || process.env.DATABASE_URL)

const internalHeaders = (tenantId: string, environment: string) => ({
  [OVOK_ENVIRONMENT_HEADER]: environment,
  [OVOK_INTERNAL_KEY_HEADER]: process.env.PAYLOAD_INTERNAL_API_KEY ?? 'test-internal-key',
  [OVOK_TENANT_HEADER]: tenantId,
})

describe.skipIf(!hasDatabase)('ovok-cms environment isolation', () => {
  let payload: Payload
  let tenantId: string

  beforeAll(async () => {
    process.env.PAYLOAD_SECRET ??= 'test-secret-with-at-least-32-characters'
    process.env.PAYLOAD_INTERNAL_API_KEY ??= 'test-internal-key'

    payload = await getPayload({ config: path.resolve(dirname, '../src/payload.config.ts') })

    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        slug: `test-${Date.now()}`,
        active: true,
        medplumProjectId: '00000000-0000-4000-8000-000000000099',
      },
      overrideAccess: true,
    })

    tenantId = String(tenant.id)
  })

  afterAll(async () => {
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
