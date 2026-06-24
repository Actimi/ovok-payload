import { describe, expect, it } from 'vitest'

import {
  contentItemsCacheKey,
  ENVIRONMENTS,
  EnvironmentSchema,
  parseEnvironment,
  schemaCacheKey,
} from './index.js'

describe('@ovok/contracts', () => {
  it('parses valid environments', () => {
    for (const env of ENVIRONMENTS) {
      expect(parseEnvironment(env)).toBe(env)
    }
    expect(parseEnvironment('invalid')).toBeNull()
  })

  it('builds cache keys', () => {
    expect(contentItemsCacheKey('tenant-1', 'dev', 'landing')).toBe(
      'cms:tenant-1:dev:landing:items',
    )
    expect(schemaCacheKey('tenant-1', 'staging')).toBe('cms:tenant-1:staging:schema')
  })

  it('validates project schemas', () => {
    const result = EnvironmentSchema.safeParse('prod')
    expect(result.success).toBe(true)
  })
})
