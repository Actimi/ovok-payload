import type { Payload } from 'payload'

import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { schemaEndpoint } from '../src/endpoints/schema'
import config from '../src/payload.config'
import { createTestTenant, deleteTestTenant, hasDatabase, proxyUser } from './helpers'

const ENVIRONMENT = 'dev'

describe.skipIf(!hasDatabase)('ovok-cms system tenant', () => {
  let payload: Payload
  let systemTenantId: string
  let projectTenantId: string

  /** Through access control, as the Ovok proxy calls it for `tenant`. */
  const asProxy = (tenant: string) => ({
    overrideAccess: false,
    user: proxyUser(tenant),
  })

  const notice = (dedupKey = crypto.randomUUID()) => ({
    dedupKey,
    kind: 'webhook.disabled',
    medplumProjectId: `project-${crypto.randomUUID()}`,
    title: 'A webhook endpoint was switched off',
  })

  const createNotice = (tenant: string, dedupKey?: string) =>
    payload.create({
      collection: 'notifications',
      data: { ...notice(dedupKey), environment: ENVIRONMENT },
      ...asProxy(tenant),
    })

  beforeAll(async () => {
    payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'tenants',
      overrideAccess: true,
      where: { kind: { equals: 'system' } },
    })
    systemTenantId = String(docs[0]?.id)
    projectTenantId = await createTestTenant(payload, 'test-system-tenant')
  })

  afterAll(async () => {
    if (payload && projectTenantId) {
      await deleteTestTenant(payload, projectTenantId)
    }
    if (payload) {
      await payload.destroy()
    }
  })

  it('exists after the migrations, with no project of its own', async () => {
    const tenant = await payload.findByID({
      id: systemTenantId,
      collection: 'tenants',
      overrideAccess: true,
    })
    expect([tenant.kind, tenant.medplumProjectId ?? null]).toEqual(['system', null])
  })

  it('still requires a project tenant to name its project', async () => {
    const create = payload.create({
      collection: 'tenants',
      data: { slug: `no-project-${crypto.randomUUID().slice(0, 8)}` },
      overrideAccess: true,
    })
    await expect(create).rejects.toThrow()
  })

  it('lets the system tenant write and find a notice by project', async () => {
    const created = await createNotice(systemTenantId)
    const { docs } = await payload.find({
      collection: 'notifications',
      where: { medplumProjectId: { equals: created.medplumProjectId } },
      ...asProxy(systemTenantId),
    })
    expect(docs.map((doc) => doc.id)).toEqual([created.id])
  })

  it("refuses a project tenant's write", async () => {
    await expect(createNotice(projectTenantId)).rejects.toMatchObject({ status: 403 })
  })

  it("refuses a project tenant's read", async () => {
    const read = payload.find({ collection: 'notifications', ...asProxy(projectTenantId) })
    await expect(read).rejects.toMatchObject({ status: 403 })
  })

  it('refuses a second notice for the same event', async () => {
    const dedupKey = crypto.randomUUID()
    await createNotice(systemTenantId, dedupKey)
    await expect(createNotice(systemTenantId, dedupKey)).rejects.toThrow()
  })

  it('records a read once per person', async () => {
    const created = await createNotice(systemTenantId)
    const read = () =>
      payload.create({
        collection: 'notification-reads',
        data: { environment: ENVIRONMENT, notificationId: Number(created.id), userId: 'user-1' },
        ...asProxy(systemTenantId),
      })
    await read()
    await expect(read()).rejects.toThrow()
  })

  it('falls back to the default locale for an untranslated mail template', async () => {
    const slug = `verify-email-${crypto.randomUUID().slice(0, 8)}`
    await payload.create({
      collection: 'email-templates',
      data: { slug, environment: ENVIRONMENT, html: '<p>Hi {{firstName}}</p>', subject: 'Verify' },
      locale: 'en',
      ...asProxy(systemTenantId),
    })
    const { docs } = await payload.find({
      collection: 'email-templates',
      fallbackLocale: 'en',
      locale: 'de',
      where: { slug: { equals: slug } },
      ...asProxy(systemTenantId),
    })
    expect(docs[0]?.subject).toBe('Verify')
  })

  it("keeps the platform collections out of the dashboard's schema", async () => {
    const response = await schemaEndpoint.handler({ payload } as never)
    const { collections } = (await response.json()) as { collections: Array<{ slug: string }> }
    const shown = new Set(collections.map((collection) => collection.slug))
    expect(
      ['email-templates', 'notifications', 'notification-reads'].filter((slug) => shown.has(slug)),
    ).toEqual([])
  })
})
