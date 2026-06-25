import type { Endpoint } from 'payload'

import { OVOK_INTERNAL_KEY_HEADER, provisionTenantSchema } from '@ovok/contracts'

type TenantRow = {
  active: boolean
  created_at: string
  id: number
  medplum_project_id: string
  slug: string
  updated_at: string
}

const rowToTenant = (row: TenantRow) => ({
  id: row.id,
  slug: row.slug,
  active: row.active,
  createdAt: row.created_at,
  medplumProjectId: row.medplum_project_id,
  updatedAt: row.updated_at,
})

/**
 * Idempotent tenant provisioning for the control plane.
 * Does not require x-ovok-tenant-id — only the shared internal key.
 *
 * Uses SQL upsert to avoid Payload document-lock housekeeping that fails on
 * legacy databases missing content_types/content_items rel columns.
 */
export const provisionTenantEndpoint: Endpoint = {
  handler: async (req) => {
    const presentedKey = req.headers.get(OVOK_INTERNAL_KEY_HEADER)
    const expectedKey = process.env.PAYLOAD_INTERNAL_API_KEY

    if (!expectedKey || presentedKey !== expectedKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = provisionTenantSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { slug, active, medplumProjectId } = parsed.data
    const pool = req.payload.db.pool

    if (!pool) {
      return Response.json({ error: 'Database unavailable' }, { status: 503 })
    }

    await pool.query(
      `UPDATE "tenants"
        SET
          "slug" = "slug" || '-orphan-' || "id"::text,
          "active" = false,
          "updated_at" = now()
        WHERE "slug" = $1
          AND "medplum_project_id" <> $2`,
      [slug, medplumProjectId],
    )

    const existingByMedplum = await pool.query<{ id: number }>(
      `SELECT "id" FROM "tenants" WHERE "medplum_project_id" = $1 LIMIT 1`,
      [medplumProjectId],
    )

    const created = existingByMedplum.rowCount === 0

    const upsert = await pool.query<TenantRow>(
      `INSERT INTO "tenants" ("medplum_project_id", "slug", "active", "updated_at", "created_at")
        VALUES ($1, $2, $3, now(), now())
        ON CONFLICT ("medplum_project_id")
        DO UPDATE SET
          "slug" = EXCLUDED."slug",
          "active" = EXCLUDED."active",
          "updated_at" = now()
        RETURNING "id", "slug", "medplum_project_id", "active", "created_at", "updated_at"`,
      [medplumProjectId, slug, active],
    )

    const row = upsert.rows[0]
    if (!row) {
      return Response.json({ error: 'Provisioning failed' }, { status: 500 })
    }

    return Response.json({ created, tenant: rowToTenant(row) }, { status: created ? 201 : 200 })
  },
  method: 'post',
  path: '/_ovok/tenants/provision',
}
