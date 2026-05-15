import type { AuthStrategy, AuthStrategyResult } from 'payload'

export const OVOK_INTERNAL_KEY_HEADER = 'x-ovok-internal-key'
export const OVOK_TENANT_HEADER = 'x-ovok-tenant-id'

/**
 * Trust-the-proxy auth strategy.
 *
 * The Ovok NestJS backend is the only allowed caller. It has already
 * validated the Medplum JWT and the project's `content-enabled` setting.
 * We trust it by checking a shared secret header, then take the tenant
 * (a Medplum Project UUID) from a second header.
 *
 * The multi-tenant plugin scopes by Payload's internal integer tenant
 * id, so we look up the row whose `medplumProjectId` matches the header
 * value and pin the synthetic user to that row. Requests targeting an
 * unknown medplumProjectId still authenticate (so /api/tenants creates
 * can succeed), they just have no tenant scope until a row exists.
 */
export const ovokInternalStrategy: AuthStrategy = {
  name: 'ovok-internal',
  authenticate: async ({ headers, payload }) => {
    const presentedKey = headers.get(OVOK_INTERNAL_KEY_HEADER)
    const expectedKey = process.env.PAYLOAD_INTERNAL_API_KEY
    if (!expectedKey || presentedKey !== expectedKey) {
      return { user: null }
    }

    const medplumProjectId = headers.get(OVOK_TENANT_HEADER)
    if (!medplumProjectId) {
      return { user: null }
    }

    let tenantPK: number | string | undefined
    try {
      const found = await payload.find({
        collection: 'tenants',
        where: { medplumProjectId: { equals: medplumProjectId } },
        limit: 1,
        overrideAccess: true,
      })
      tenantPK = found.docs[0]?.id
    } catch (error) {
      payload.logger.warn(
        `ovok-internal: tenant lookup failed for medplumProjectId=${medplumProjectId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }

    return {
      user: {
        id: `ovok-proxy:${medplumProjectId}`,
        collection: 'users',
        email: 'proxy@ovok.local',
        tenants: tenantPK ? [{ tenant: tenantPK }] : [],
      },
    } as unknown as AuthStrategyResult
  },
}
