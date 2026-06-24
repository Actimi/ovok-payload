import type { Context, Next } from 'hono'

import { OVOK_INTERNAL_KEY_HEADER } from '@ovok/contracts'

export const internalAuth = async (c: Context, next: Next) => {
  const presented = c.req.header(OVOK_INTERNAL_KEY_HEADER)
  const expected = process.env.OVOK_INTERNAL_API_KEY

  if (!expected || presented !== expected) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
}
