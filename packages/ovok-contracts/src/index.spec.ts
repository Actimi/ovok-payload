import { describe, expect, it } from 'vitest'

import {
  contentItemsCacheKey,
  parseEnvironment,
  provisionTenantSchema,
  schemaCacheKey,
} from '@ovok/contracts'

describe('@ovok/contracts', () => {
  it('builds cache keys', () => {
    expect(contentItemsCacheKey('tenant-1', 'dev', 'landing')).toBe(
      'cms:tenant-1:dev:landing:items',
    )
    expect(schemaCacheKey('tenant-1', 'staging')).toBe('cms:tenant-1:staging:schema')
  })

  it('parses environment header values', () => {
    expect(parseEnvironment('prod')).toBe('prod')
    expect(parseEnvironment('invalid')).toBeNull()
  })

  it('validates provision tenant payload', () => {
    const result = provisionTenantSchema.safeParse({
      slug: 'acme',
      medplumProjectId: '00000000-0000-4000-8000-000000000001',
    })
    expect(result.success).toBe(true)
  })
})
