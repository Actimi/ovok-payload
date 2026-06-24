import { ProvisionTenantSchema } from '@ovok/contracts'

const cmsBaseUrl = () => process.env.OVOK_CMS_URL ?? 'http://localhost:3000'

/** Payload 3 serves custom endpoints under /api (endpoint path is /_ovok/...). */
export const provisionTenantUrl = (baseUrl = cmsBaseUrl()) =>
  `${baseUrl.replace(/\/$/, '')}/api/_ovok/tenants/provision`

export const provisionPayloadTenant = async (input: {
  active?: boolean
  medplumProjectId: string
  slug: string
}) => {
  const parsed = ProvisionTenantSchema.parse({
    ...input,
    active: input.active ?? true,
  })

  const internalKey = process.env.OVOK_INTERNAL_API_KEY
  if (!internalKey) {
    throw new Error('OVOK_INTERNAL_API_KEY is not configured')
  }

  const response = await fetch(provisionTenantUrl(), {
    body: JSON.stringify(parsed),
    headers: {
      'Content-Type': 'application/json',
      'x-ovok-internal-key': internalKey,
    },
    method: 'POST',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`CMS tenant provisioning failed (${response.status}): ${body}`)
  }

  return response.json()
}
