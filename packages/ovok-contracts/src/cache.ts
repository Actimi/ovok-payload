import type { Environment } from './environment.js'

/** Redis key for published content items list (ovok-core proxy cache). */
export const contentItemsCacheKey = (
  tenantId: string,
  environment: Environment,
  contentTypeSlug: string,
): string => `cms:${tenantId}:${environment}:${contentTypeSlug}:items`

/** Redis key for CMS schema introspection (ovok-core proxy cache). */
export const schemaCacheKey = (tenantId: string, environment: Environment): string =>
  `cms:${tenantId}:${environment}:schema`

/** Default TTLs in seconds for ovok-core Redis cache. */
export const CACHE_TTL = {
  contentItems: 60,
  schema: 300,
} as const

/** HTTP Cache-Control for public content delivery via ovok-core. */
export const PUBLIC_CONTENT_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300'

/** HTTP Cache-Control for authenticated dashboard routes. */
export const AUTHENTICATED_CACHE_CONTROL = 'no-store'

/** HTTP Cache-Control for CMS schema endpoint. */
export const SCHEMA_CACHE_CONTROL = 'private, max-age=300'

/** HTTP Cache-Control for health checks. */
export const HEALTH_CACHE_CONTROL = 'no-store'

/** ovok-core internal cache purge endpoint (called from CMS hooks). */
export const CACHE_PURGE_PATH = '/internal/cache/purge'

export interface CachePurgePayload {
  contentTypeSlug?: string
  environment: Environment
  purgeSchema?: boolean
  tenantId: string
}
