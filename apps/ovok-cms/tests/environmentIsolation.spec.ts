import { describe, expect, it } from 'vitest'

import {
  combineWhere,
  environmentWhere,
  getEnvironmentFromRequest,
  requireEnvironmentFromRequest,
} from '../src/access/ovokInternal'

const mockReq = (headers: Record<string, string>) =>
  ({
    headers: new Headers(headers),
    user: headers['x-ovok-internal-key'] ? { id: 'test' } : null,
  }) as Parameters<typeof getEnvironmentFromRequest>[0]

describe('ovok environment access', () => {
  it('defaults to dev when environment header is missing on read', () => {
    expect(getEnvironmentFromRequest(mockReq({}))).toBe('dev')
  })

  it('parses environment header', () => {
    expect(getEnvironmentFromRequest(mockReq({ 'x-ovok-environment': 'staging' }))).toBe('staging')
  })

  it('requires valid environment header on writes', () => {
    expect(requireEnvironmentFromRequest(mockReq({}))).toBeNull()
    expect(requireEnvironmentFromRequest(mockReq({ 'x-ovok-environment': 'prod' }))).toBe('prod')
    expect(requireEnvironmentFromRequest(mockReq({ 'x-ovok-environment': 'invalid' }))).toBeNull()
  })

  it('combines where clauses', () => {
    const base = { slug: { equals: 'test' } }
    const env = environmentWhere('dev')
    expect(combineWhere(base, env)).toEqual({ and: [base, env] })
    expect(combineWhere(undefined, env)).toEqual(env)
  })
})

describe('ovokEnvironment plugin indexes', () => {
  it('defines environment field name constant', async () => {
    const { ENVIRONMENT_FIELD_NAME } = await import('../src/plugins/ovokEnvironment')
    expect(ENVIRONMENT_FIELD_NAME).toBe('environment')
  })
})

describe('migration registry', () => {
  it('exports committed migrations', async () => {
    const { migrations } = await import('../src/migrations/index')
    expect(migrations.length).toBeGreaterThanOrEqual(1)
    expect(migrations[0].name).toMatch(/^\d{8}_\d{6}_/)
  })
})
