import type { Payload } from 'payload'

import { getPayload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

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

const proxyReq = (tenantId: string, environment: string) =>
  ({
    headers: new Headers(internalHeaders(tenantId, environment)),
    user: {
      id: `ovok-proxy:${tenantId}`,
      collection: 'users',
      email: 'proxy@ovok.local',
      tenants: [{ tenant: tenantId }],
    },
  }) as any

describe.skipIf(!hasDatabase)('ovok-cms localized content collections', () => {
  let payload: Payload
  let tenantId: string
  const createdReleaseNoteIDs: Array<number | string> = []
  const createdLegalPageIDs: Array<number | string> = []

  beforeAll(async () => {
    payload = await getPayload({ config })

    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        slug: `test-localized-${Date.now()}`,
        active: true,
        medplumProjectId: `00000000-0000-4000-8001-${Date.now().toString(16).padStart(12, '0')}`,
      },
      overrideAccess: true,
    })

    tenantId = String(tenant.id)
  })

  afterEach(async () => {
    for (const id of createdReleaseNoteIDs) {
      await payload.delete({ id, collection: 'release-notes', overrideAccess: true })
    }
    createdReleaseNoteIDs.length = 0

    for (const id of createdLegalPageIDs) {
      await payload.delete({ id, collection: 'legal-pages', overrideAccess: true })
    }
    createdLegalPageIDs.length = 0
  })

  afterAll(async () => {
    if (payload && tenantId) {
      await payload.delete({ id: tenantId, collection: 'tenants', overrideAccess: true })
    }
    if (payload) {
      await payload.destroy()
    }
  })

  it('should store one value per locale and fall back to the default locale', async () => {
    const created = await payload.create({
      collection: 'release-notes',
      data: {
        slug: `august-update-${Date.now()}`,
        publishedAt: new Date('2026-08-01T00:00:00.000Z').toISOString(),
        status: 'published',
        tags: ['new'],
        title: 'August-Update',
      },
      locale: 'de',
      req: proxyReq(tenantId, 'dev'),
    })

    createdReleaseNoteIDs.push(created.id)

    await payload.update({
      id: created.id,
      collection: 'release-notes',
      data: { title: 'August update' },
      locale: 'en',
      req: proxyReq(tenantId, 'dev'),
    })

    const deDoc = await payload.findByID({
      id: created.id,
      collection: 'release-notes',
      locale: 'de',
      req: proxyReq(tenantId, 'dev'),
    })

    const enDoc = await payload.findByID({
      id: created.id,
      collection: 'release-notes',
      locale: 'en',
      req: proxyReq(tenantId, 'dev'),
    })

    expect(deDoc.title).toBe('August-Update')
    expect(enDoc.title).toBe('August update')
  })

  it('should fall back to the default locale when a translation is missing', async () => {
    const created = await payload.create({
      collection: 'release-notes',
      data: {
        publishedAt: new Date('2026-08-02T00:00:00.000Z').toISOString(),
        status: 'draft',
        title: 'Nur Deutsch',
      },
      locale: 'de',
      req: proxyReq(tenantId, 'dev'),
    })

    createdReleaseNoteIDs.push(created.id)

    const enDoc = await payload.findByID({
      id: created.id,
      collection: 'release-notes',
      fallbackLocale: 'de',
      locale: 'en',
      req: proxyReq(tenantId, 'dev'),
    })

    expect(enDoc.title).toBe('Nur Deutsch')
  })

  it('should keep release notes environment-isolated like the other content collections', async () => {
    const created = await payload.create({
      collection: 'release-notes',
      data: {
        publishedAt: new Date('2026-08-03T00:00:00.000Z').toISOString(),
        status: 'published',
        title: 'Dev only',
      },
      req: proxyReq(tenantId, 'dev'),
    })

    createdReleaseNoteIDs.push(created.id)

    const devResults = await payload.find({
      collection: 'release-notes',
      req: proxyReq(tenantId, 'dev'),
      where: { id: { equals: created.id } },
    })

    const stagingResults = await payload.find({
      collection: 'release-notes',
      req: proxyReq(tenantId, 'staging'),
      where: { id: { equals: created.id } },
    })

    expect(devResults.totalDocs).toBe(1)
    expect(stagingResults.totalDocs).toBe(0)
  })

  it('should filter release notes by published status the way public delivery does', async () => {
    const marker = `status-filter-${Date.now()}`

    const draft = await payload.create({
      collection: 'release-notes',
      data: {
        excerpt: marker,
        publishedAt: new Date('2026-08-04T00:00:00.000Z').toISOString(),
        status: 'draft',
        title: 'Draft note',
      },
      req: proxyReq(tenantId, 'dev'),
    })
    const published = await payload.create({
      collection: 'release-notes',
      data: {
        excerpt: marker,
        publishedAt: new Date('2026-08-05T00:00:00.000Z').toISOString(),
        status: 'published',
        title: 'Published note',
      },
      req: proxyReq(tenantId, 'dev'),
    })

    createdReleaseNoteIDs.push(draft.id, published.id)

    const results = await payload.find({
      collection: 'release-notes',
      req: proxyReq(tenantId, 'dev'),
      where: { and: [{ excerpt: { equals: marker } }, { status: { equals: 'published' } }] },
    })

    expect(results.totalDocs).toBe(1)
    expect(results.docs[0]?.id).toBe(published.id)
  })

  it('should reject a duplicate legal-page slug within the same tenant and environment', async () => {
    const slug = `terms-${Date.now()}`

    const first = await payload.create({
      collection: 'legal-pages',
      data: {
        slug,
        status: 'published',
        title: 'Terms & Conditions',
      },
      locale: 'de',
      req: proxyReq(tenantId, 'dev'),
    })

    createdLegalPageIDs.push(first.id)

    await expect(
      payload.create({
        collection: 'legal-pages',
        data: {
          slug,
          status: 'draft',
          title: 'Terms duplicate',
        },
        locale: 'de',
        req: proxyReq(tenantId, 'dev'),
      }),
    ).rejects.toThrow()
  })

  it('should include the new collections migration in prod migrations', async () => {
    const { migrations } = await import('../src/migrations/index')
    expect(migrations.map((m) => m.name)).toContain('20260806_000000_release_notes_legal_pages')
  })
})
