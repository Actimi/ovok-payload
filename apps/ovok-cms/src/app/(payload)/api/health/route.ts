import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Liveness + readiness probe used by Railway's health check.
 *
 * Returns 200 only when Payload has fully initialized (push schema sync
 * complete) and can query the database. Returns 503 otherwise so Railway
 * marks the instance as unhealthy and restarts it — this is intentional:
 * if Postgres was unreachable at startup, push: true never ran and the
 * schema is incomplete. A restart lets Payload retry the sync once the
 * DB is available again.
 */
export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise })
    // Lightweight read — confirms both connection and schema exist.
    await payload.find({ collection: 'users', limit: 0 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 503 })
  }
}
