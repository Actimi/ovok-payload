import { sql } from 'drizzle-orm'
import { Hono } from 'hono'

import { db } from '../db/index.js'

export const healthRouter = new Hono()

healthRouter.get('/', async (c) => {
  try {
    await db.execute(sql`select 1`)
    return c.json({ service: 'ovok-control-plane', status: 'ok' })
  } catch (error) {
    return c.json(
      {
        message: error instanceof Error ? error.message : 'health check failed',
        service: 'ovok-control-plane',
        status: 'error',
      },
      503,
    )
  }
})
