import type { Endpoint } from 'payload'

import { HEALTH_CACHE_CONTROL } from '@ovok/contracts'

export const healthEndpoint: Endpoint = {
  handler: async ({ payload }) => {
    try {
      await payload.find({
        collection: 'tenants',
        limit: 1,
        overrideAccess: true,
      })

      return Response.json(
        { status: 'ok', timestamp: new Date().toISOString() },
        { headers: { 'Cache-Control': HEALTH_CACHE_CONTROL } },
      )
    } catch (error) {
      return Response.json(
        {
          message: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
          timestamp: new Date().toISOString(),
        },
        { headers: { 'Cache-Control': HEALTH_CACHE_CONTROL }, status: 503 },
      )
    }
  },
  method: 'get',
  path: '/_ovok/health',
}
