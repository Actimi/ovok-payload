import type { Payload } from 'payload'

import {
  OVOK_ENVIRONMENT_HEADER,
  OVOK_INTERNAL_KEY_HEADER,
  OVOK_TENANT_HEADER,
} from '../src/access/ovokInternal'

/** DB int suites run only when a database is configured (CI provides one; see .github/workflows/ovok.yml). */
export const hasDatabase = Boolean(process.env.DATABASE_URI || process.env.DATABASE_URL)

export const internalHeaders = (tenantId: string, environment: string): Record<string, string> => ({
  [OVOK_ENVIRONMENT_HEADER]: environment,
  [OVOK_INTERNAL_KEY_HEADER]: process.env.PAYLOAD_INTERNAL_API_KEY ?? 'test-internal-key',
  [OVOK_TENANT_HEADER]: tenantId,
})

const buildProxyUser = (tenantId: string) => ({
  id: `ovok-proxy:${tenantId}`,
  collection: 'users',
  email: 'proxy@ovok.local',
  tenants: [{ tenant: tenantId }],
})

/** The synthetic user the Ovok proxy's auth strategy produces — pass as `user` with `overrideAccess: false` to exercise access control. */
export const proxyUser = (tenantId: string) => buildProxyUser(tenantId) as never

/** Simulates the request context the Ovok proxy's auth strategy produces. */
export const proxyReq = (tenantId: string, environment: string) =>
  ({
    headers: new Headers(internalHeaders(tenantId, environment)),
    user: buildProxyUser(tenantId),
  }) as never

/** Creates a test tenant with a unique slug/medplumProjectId per call (unique across parallel workers). Callers delete it in their teardown. */
export async function createTestTenant(payload: Payload, prefix: string): Promise<string> {
  const unique = crypto.randomUUID()
  const tenant = await payload.create({
    collection: 'tenants',
    data: {
      slug: `${prefix}-${unique.slice(0, 13)}`,
      active: true,
      medplumProjectId: unique,
    },
    overrideAccess: true,
  })
  return String(tenant.id)
}

export async function deleteTestTenant(payload: Payload, tenantId: string): Promise<void> {
  await payload.delete({ id: tenantId, collection: 'tenants', overrideAccess: true })
}
