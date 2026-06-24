import type { AuthStrategy, PayloadRequest, Where } from 'payload'

import {
  DEFAULT_ENVIRONMENT,
  type Environment,
  OVOK_ENVIRONMENT_FIELD,
  OVOK_ENVIRONMENT_HEADER,
  OVOK_INTERNAL_KEY_HEADER,
  OVOK_TENANT_HEADER,
  parseEnvironment,
} from '@ovok/contracts'

import type { User } from '../payload-types.js'

export { OVOK_ENVIRONMENT_HEADER, OVOK_INTERNAL_KEY_HEADER, OVOK_TENANT_HEADER }

const readEnvironmentHeader = (headers: PayloadRequest['headers']): null | string => {
  if (!headers) {
    return null
  }

  if (typeof headers.get === 'function') {
    return headers.get(OVOK_ENVIRONMENT_HEADER)
  }

  return null
}

export const getEnvironmentFromRequest = (req: Pick<PayloadRequest, 'headers'>): Environment =>
  parseEnvironment(readEnvironmentHeader(req.headers)) ?? DEFAULT_ENVIRONMENT

export const requireEnvironmentFromRequest = (
  req: Pick<PayloadRequest, 'headers'>,
): Environment | null => parseEnvironment(readEnvironmentHeader(req.headers))

export const environmentWhere = (environment: Environment): Where => ({
  [OVOK_ENVIRONMENT_FIELD]: { equals: environment },
})

export const combineWhere = (base: undefined | Where, extra: Where): Where => {
  if (!base) {
    return extra
  }

  return { and: [base, extra] }
}

/**
 * Trust-the-proxy auth strategy.
 *
 * The Ovok NestJS backend is the only allowed caller. It has already
 * validated the Medplum JWT and the project's `content-enabled` setting.
 * We trust it by checking a shared secret header, then take the tenant
 * ID from a second header injected by the same proxy.
 *
 * The synthetic user returned here is throwaway — Payload's user concept
 * is not used for authorisation; the multi-tenant plugin handles scoping
 * via the tenant field on every collection.
 */
export const ovokInternalStrategy: AuthStrategy = {
  name: 'ovok-internal',
  authenticate: ({ headers }) => {
    const presentedKey = headers.get(OVOK_INTERNAL_KEY_HEADER)
    const expectedKey = process.env.PAYLOAD_INTERNAL_API_KEY
    if (!expectedKey || presentedKey !== expectedKey) {
      return { user: null }
    }

    const tenantId = headers.get(OVOK_TENANT_HEADER)
    if (!tenantId) {
      return { user: null }
    }

    const user: User = {
      id: 0,
      collection: 'users',
      createdAt: new Date(0).toISOString(),
      email: 'proxy@ovok.local',
      updatedAt: new Date(0).toISOString(),
    }

    return { user }
  },
}
