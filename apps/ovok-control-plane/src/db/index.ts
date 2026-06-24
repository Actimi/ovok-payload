import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema.js'

const connectionString =
  process.env.CONTROL_PLANE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://control:control@localhost:5433/ovok_control_plane'

const client = postgres(connectionString, { max: 10 })

export const db = drizzle(client, { schema })

export const closeDb = async () => {
  await client.end()
}
