import type { Environment } from './environment.js'

/** ovok-core proxy routing targets. */
export type ProxyBackend = 'cdn' | 'ovok-cms' | 'ovok-control-plane'

export interface ProxyRoute {
  /** Backend service to forward to. */
  backend: ProxyBackend
  /** Whether ovok-core should apply Redis caching for GET requests. */
  cacheable: boolean
  /** Public path pattern exposed by ovok-core. */
  publicPath: string
  /** Required Ovok headers on proxied CMS requests. */
  requiredHeaders?: readonly string[]
}

/** Routing map for ovok-core integration (Phase 7). */
export const PROXY_ROUTES: readonly ProxyRoute[] = [
  {
    backend: 'ovok-cms',
    cacheable: false,
    publicPath: '/v1/content/*',
    requiredHeaders: ['x-ovok-internal-key', 'x-ovok-tenant-id', 'x-ovok-environment'],
  },
  {
    backend: 'ovok-control-plane',
    cacheable: false,
    publicPath: '/v1/cms/projects/*',
    requiredHeaders: ['x-ovok-internal-key'],
  },
  {
    backend: 'ovok-cms',
    cacheable: true,
    publicPath: '/v1/public/cms/:contentTypeSlug/items',
    requiredHeaders: ['x-ovok-internal-key', 'x-ovok-tenant-id', 'x-ovok-environment'],
  },
] as const

export interface ProxyRequestContext {
  environment: Environment
  internalKey: string
  medplumProjectId: string
  tenantId: string
}
