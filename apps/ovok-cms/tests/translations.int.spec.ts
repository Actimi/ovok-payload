import type { Payload } from 'payload'

import { getPayload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import config from '../src/payload.config'
import { createTestTenant, deleteTestTenant, hasDatabase, proxyReq, proxyUser } from './helpers'

describe.skipIf(!hasDatabase)('ovok-cms translations collection', () => {
  let payload: Payload
  let tenantId: string
  const createdIDs: Array<number | string> = []

  /** A published group in English, in `tenant` and `environment`. */
  const createGroup = async (
    tenant: string,
    environment: string,
    strings: Array<{ key: string; value: string }>,
    slug = `sign-in-${crypto.randomUUID()}`,
  ) => {
    const created = await payload.create({
      collection: 'translations',
      data: { slug, status: 'published', strings, title: 'Sign-in screen' },
      locale: 'en',
      req: proxyReq(tenant, environment),
    })
    createdIDs.push(created.id)
    return created
  }

  beforeAll(async () => {
    payload = await getPayload({ config })
    tenantId = await createTestTenant(payload, 'test-translations')
  })

  afterEach(async () => {
    for (const id of createdIDs) {
      await payload.delete({ id, collection: 'translations', overrideAccess: true })
    }
    createdIDs.length = 0
  })

  afterAll(async () => {
    if (payload && tenantId) {
      await deleteTestTenant(payload, tenantId)
    }
    if (payload) {
      await payload.destroy()
    }
  })

  it('should fall back to the default locale string by string, not group by group', async () => {
    const created = await createGroup(tenantId, 'dev', [
      { key: 'title', value: 'Sign in' },
      { key: 'button', value: 'Continue' },
    ])
    const [title, button] = created.strings ?? []

    // German for the title only: the button row keeps no German text.
    await payload.update({
      id: created.id,
      collection: 'translations',
      data: {
        strings: [
          { id: title?.id, key: 'title', value: 'Anmelden' },
          { id: button?.id, key: 'button' },
        ],
      },
      locale: 'de',
      req: proxyReq(tenantId, 'dev'),
    })

    const deDoc = await payload.findByID({
      id: created.id,
      collection: 'translations',
      locale: 'de',
      req: proxyReq(tenantId, 'dev'),
    })
    const enDoc = await payload.findByID({
      id: created.id,
      collection: 'translations',
      locale: 'en',
      req: proxyReq(tenantId, 'dev'),
    })

    expect(deDoc.strings?.map((row) => [row.key, row.value])).toEqual([
      ['title', 'Anmelden'],
      ['button', 'Continue'],
    ])
    expect(enDoc.strings?.map((row) => [row.key, row.value])).toEqual([
      ['title', 'Sign in'],
      ['button', 'Continue'],
    ])
  })

  it('should keep translations environment-isolated like the other content collections', async () => {
    const created = await createGroup(tenantId, 'dev', [{ key: 'title', value: 'Dev only' }])

    const devResults = await payload.find({
      collection: 'translations',
      req: proxyReq(tenantId, 'dev'),
      where: { id: { equals: created.id } },
    })
    const stagingResults = await payload.find({
      collection: 'translations',
      req: proxyReq(tenantId, 'staging'),
      where: { id: { equals: created.id } },
    })

    expect(devResults.totalDocs).toBe(1)
    expect(stagingResults.totalDocs).toBe(0)
  })

  it('should never expose one tenant’s translations to another tenant', async () => {
    const otherTenantId = await createTestTenant(payload, 'test-translations-isolation')
    const created = await createGroup(tenantId, 'dev', [{ key: 'title', value: 'Tenant A only' }])

    try {
      // overrideAccess: false is load-bearing — the multi-tenant read filter
      // is access-control, and Payload's local API bypasses access by default.
      const forOtherTenant = await payload.find({
        collection: 'translations',
        overrideAccess: false,
        req: proxyReq(otherTenantId, 'dev'),
        user: proxyUser(otherTenantId),
        where: { id: { equals: created.id } },
      })
      const forOwner = await payload.find({
        collection: 'translations',
        overrideAccess: false,
        req: proxyReq(tenantId, 'dev'),
        user: proxyUser(tenantId),
        where: { id: { equals: created.id } },
      })

      expect(forOtherTenant.totalDocs).toBe(0)
      expect(forOwner.totalDocs).toBe(1)
    } finally {
      await deleteTestTenant(payload, otherTenantId)
    }
  })

  it('should reject a second group with the same slug within the same tenant and environment', async () => {
    const slug = `common-${Date.now()}`
    await createGroup(tenantId, 'dev', [{ key: 'cancel', value: 'Cancel' }], slug)

    await expect(
      createGroup(tenantId, 'dev', [{ key: 'cancel', value: 'Abort' }], slug),
    ).rejects.toThrow()
  })

  it('should include the translations migration in prod migrations', async () => {
    const { migrations } = await import('../src/migrations/index')

    expect(migrations.map((m) => m.name)).toContain('20261003_000000_translations')
  })
})
