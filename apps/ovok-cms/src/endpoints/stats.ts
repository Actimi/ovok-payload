import type { Endpoint } from 'payload'

/**
 * Per-tenant content counts. Used by the dashboard's main overview to
 * fill the "Content" stat card without making the dashboard scrape the
 * REST list endpoints.
 *
 * Reachable from outside the cluster via the Ovok proxy:
 *   GET /v1/content/api/_ovok/stats
 *
 * The multi-tenant plugin's auth strategy stamps the synthetic user's
 * `tenants` array based on the x-ovok-tenant-id header, so we know which
 * tenant to count for from req.user — there is no caller-supplied
 * filter, which would otherwise be a cross-tenant leak vector.
 */

interface UserTenantRef {
  tenant?: string | { id?: string }
}

function resolveTenantId(reqUser: unknown): string | null {
  if (!reqUser || typeof reqUser !== 'object') return null
  const tenants = (reqUser as { tenants?: UserTenantRef[] }).tenants
  if (!Array.isArray(tenants) || tenants.length === 0) return null
  const ref = tenants[0]?.tenant
  if (typeof ref === 'string') return ref
  if (ref && typeof ref === 'object' && typeof ref.id === 'string') return ref.id
  return null
}

export const statsEndpoint: Endpoint = {
  path: '/_ovok/stats',
  method: 'get',
  handler: async (req) => {
    const { payload, user } = req
    const tenantId = resolveTenantId(user)
    if (!tenantId) {
      return Response.json(
        { message: 'No tenant in context.' },
        { status: 403 },
      )
    }

    // `payload.count` returns { totalDocs }. Each collection is queried
    // with an explicit tenant filter — even though the multi-tenant
    // plugin already filters via access functions, being explicit means
    // a future plugin version that changes its filter semantics won't
    // silently leak cross-tenant counts.
    const where = { tenant: { equals: tenantId } }
    const [items, media, types] = await Promise.all([
      payload.count({ collection: 'content-items', where }),
      payload.count({ collection: 'media', where }),
      payload.count({ collection: 'content-types', where }),
    ])

    return Response.json({
      tenantId,
      counts: {
        contentItems: items.totalDocs,
        media: media.totalDocs,
        contentTypes: types.totalDocs,
      },
    })
  },
}
