import { describe, expect, it } from 'vitest'

import { ContentTypes } from '../src/collections/ContentTypes'

const beforeOperation = ContentTypes.hooks!.beforeOperation![0]!

const write = (data: unknown) => () => beforeOperation({ args: { data } } as never)

const badShape = /list of field definitions/

describe('content-types item fields', () => {
  it('takes a list of field definitions', () => {
    expect(write({ fields: [{ key: 'headline', label: 'Headline', type: 'text' }] })).not.toThrow()
  })

  it('takes a write that sets no fields at all', () => {
    expect(write({ name: 'DisplayBanner' })).not.toThrow()
    expect(write({ fields: [] })).not.toThrow()
  })

  it('refuses an object, which Payload would have stored as no fields', () => {
    expect(write({ fields: { desc: 'xyz', time: 'xyz' } })).toThrow(badShape)
  })

  it('refuses a bare string', () => {
    expect(write({ fields: 'desc' })).toThrow(badShape)
  })

  it('refuses a list of anything but definitions', () => {
    expect(write({ fields: ['desc', 'time'] })).toThrow(badShape)
    expect(write({ fields: [null] })).toThrow(badShape)
    expect(write({ fields: [['desc']] })).toThrow(badShape)
  })

  it('passes an operation that carries no body', () => {
    expect(() => beforeOperation({ args: {} } as never)).not.toThrow()
  })
})
