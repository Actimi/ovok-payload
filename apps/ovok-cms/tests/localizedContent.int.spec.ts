import type { Payload } from 'payload'

import { getPayload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import config from '../src/payload.config'
import { createTestTenant, deleteTestTenant, hasDatabase, proxyReq, proxyUser } from './helpers'

describe.skipIf(!hasDatabase)('ovok-cms localized content collections', () => {
  let payload: Payload
  let tenantId: string
  const createdReleaseNoteIDs: Array<number | string> = []
  const createdLegalPageIDs: Array<number | string> = []

  beforeAll(async () => {
    payload = await getPayload({ config })
    tenantId = await createTestTenant(payload, 'test-localized')
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
      await deleteTestTenant(payload, tenantId)
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

    await payload.update({
      id: created.id,
      collection: 'release-notes',
      data: { title: 'Mise à jour d’août' },
      locale: 'fr',
      req: proxyReq(tenantId, 'dev'),
    })

    await payload.update({
      id: created.id,
      collection: 'release-notes',
      data: { title: 'Actualización de agosto' },
      locale: 'es',
      req: proxyReq(tenantId, 'dev'),
    })

    const titlesByLocale: Record<string, string> = {}
    for (const locale of ['de', 'en', 'fr', 'es'] as const) {
      const doc = await payload.findByID({
        id: created.id,
        collection: 'release-notes',
        locale,
        req: proxyReq(tenantId, 'dev'),
      })
      titlesByLocale[locale] = String(doc.title)
    }

    expect(titlesByLocale).toEqual({
      de: 'August-Update',
      en: 'August update',
      es: 'Actualización de agosto',
      fr: 'Mise à jour d’août',
    })
  })

  it('should fall back to the default locale (en) when a translation is missing', async () => {
    const created = await payload.create({
      collection: 'release-notes',
      data: {
        publishedAt: new Date('2026-08-02T00:00:00.000Z').toISOString(),
        status: 'draft',
        title: 'English only',
      },
      locale: 'en',
      req: proxyReq(tenantId, 'dev'),
    })

    createdReleaseNoteIDs.push(created.id)

    const frDoc = await payload.findByID({
      id: created.id,
      collection: 'release-notes',
      locale: 'fr',
      req: proxyReq(tenantId, 'dev'),
    })

    expect(frDoc.title).toBe('English only')
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

  it('should never expose one tenant’s release notes or legal pages to another tenant', async () => {
    const otherTenantId = await createTestTenant(payload, 'test-isolation')

    const note = await payload.create({
      collection: 'release-notes',
      data: {
        publishedAt: new Date('2026-08-06T00:00:00.000Z').toISOString(),
        status: 'published',
        title: 'Tenant A only',
      },
      req: proxyReq(tenantId, 'dev'),
    })
    const page = await payload.create({
      collection: 'legal-pages',
      data: {
        slug: `tenant-a-terms-${Date.now()}`,
        status: 'published',
        title: 'Tenant A terms',
      },
      req: proxyReq(tenantId, 'dev'),
    })
    createdReleaseNoteIDs.push(note.id)
    createdLegalPageIDs.push(page.id)

    try {
      // overrideAccess: false is load-bearing — the multi-tenant read filter
      // is access-control, and Payload's local API bypasses access by default.
      const notesForOtherTenant = await payload.find({
        collection: 'release-notes',
        overrideAccess: false,
        req: proxyReq(otherTenantId, 'dev'),
        user: proxyUser(otherTenantId),
        where: { id: { equals: note.id } },
      })
      const pagesForOtherTenant = await payload.find({
        collection: 'legal-pages',
        overrideAccess: false,
        req: proxyReq(otherTenantId, 'dev'),
        user: proxyUser(otherTenantId),
        where: { id: { equals: page.id } },
      })

      expect(notesForOtherTenant.totalDocs).toBe(0)
      expect(pagesForOtherTenant.totalDocs).toBe(0)

      // Sanity check: the owning tenant CAN read its own documents under the
      // same access-enforced conditions.
      const notesForOwner = await payload.find({
        collection: 'release-notes',
        overrideAccess: false,
        req: proxyReq(tenantId, 'dev'),
        user: proxyUser(tenantId),
        where: { id: { equals: note.id } },
      })
      expect(notesForOwner.totalDocs).toBe(1)
    } finally {
      await deleteTestTenant(payload, otherTenantId)
    }
  })

  it('should reject unauthenticated access outright (defense in depth)', async () => {
    await expect(
      payload.find({
        collection: 'release-notes',
        overrideAccess: false,
        req: { headers: new Headers(), user: null } as never,
      }),
    ).rejects.toThrow()
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

  it('should include the collections and locale migrations in prod migrations', async () => {
    const { migrations } = await import('../src/migrations/index')
    const names = migrations.map((m) => m.name)
    expect(names).toContain('20260806_000000_release_notes_legal_pages')
    expect(names).toContain('20260807_000000_locales_fr_es')
  })
})
