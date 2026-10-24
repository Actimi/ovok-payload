import type { Access } from 'payload'

/**
 * Platform records (system mail, notifications) live in the one `system` tenant. A
 * project's proxy carries its own tenant, so it can neither read nor write them.
 */
export const systemTenantOnly: Access = async ({ req }) => {
  const tenantId = (req.user as { tenants?: Array<{ tenant?: number | string }> } | null)
    ?.tenants?.[0]?.tenant
  if (tenantId === undefined || tenantId === null) {
    return false
  }
  const tenant = await req.payload.findByID({
    id: tenantId,
    collection: 'tenants',
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
  })
  return tenant?.kind === 'system'
}

export const systemTenantAccess = {
  create: systemTenantOnly,
  delete: systemTenantOnly,
  read: systemTenantOnly,
  update: systemTenantOnly,
}
