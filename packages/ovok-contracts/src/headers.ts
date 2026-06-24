/** Shared secret header — must match PAYLOAD_INTERNAL_API_KEY / OVOK_INTERNAL_API_KEY. */
export const OVOK_INTERNAL_KEY_HEADER = 'x-ovok-internal-key'

/** Payload tenant document ID injected by ovok-core proxy. */
export const OVOK_TENANT_HEADER = 'x-ovok-tenant-id'

/** Target environment for the request: dev | staging | prod. */
export const OVOK_ENVIRONMENT_HEADER = 'x-ovok-environment'

/** Medplum project UUID for the active tenant. */
export const OVOK_MEDPLUM_PROJECT_HEADER = 'x-ovok-medplum-project-id'

export const OVOK_PROXY_HEADERS = [
  OVOK_INTERNAL_KEY_HEADER,
  OVOK_TENANT_HEADER,
  OVOK_ENVIRONMENT_HEADER,
  OVOK_MEDPLUM_PROJECT_HEADER,
] as const
