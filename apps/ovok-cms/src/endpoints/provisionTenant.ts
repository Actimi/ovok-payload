import type { Endpoint } from 'payload'

import { OVOK_INTERNAL_KEY_HEADER, provisionTenantSchema } from '@ovok/contracts'

/**
 * Idempotent tenant provisioning for the control plane.
 * Does not require x-ovok-tenant-id — only the shared internal key.
 */
export const provisionTenantEndpoint: Endpoint = {
  handler: async (req) => {
    const presentedKey = req.headers.get(OVOK_INTERNAL_KEY_HEADER)
    const expectedKey = process.env.PAYLOAD_INTERNAL_API_KEY

    if (!expectedKey || presentedKey !== expectedKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = provisionTenantSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { slug, active, medplumProjectId } = parsed.data

    const existing = await req.payload.find({
      collection: 'tenants',
      limit: 1,
      overrideAccess: true,
      where: {
        or: [{ slug: { equals: slug } }, { medplumProjectId: { equals: medplumProjectId } }],
      },
    })

    if (existing.docs[0]) {
      const updated = await req.payload.update({
        id: existing.docs[0].id,
        collection: 'tenants',
        data: { slug, active, medplumProjectId },
        overrideAccess: true,
      })
      return Response.json({ created: false, tenant: updated })
    }

    const created = await req.payload.create({
      collection: 'tenants',
      data: { slug, active, medplumProjectId },
      overrideAccess: true,
    })

    return Response.json({ created: true, tenant: created }, { status: 201 })
  },
  method: 'post',
  path: '/_ovok/tenants/provision',
}
