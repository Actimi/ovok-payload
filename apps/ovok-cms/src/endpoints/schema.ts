import type { Endpoint, Field, SanitizedCollectionConfig } from 'payload'

/**
 * Returns a normalised description of every collection so the Ovok Dashboard
 * can render Payload-style CRUD forms without bundling Payload's admin UI.
 *
 * Reachable from outside the cluster via the Ovok proxy:
 *   GET /v1/content/api/_ovok/schema
 *
 * Direct access (inside the cluster, with internal-key header):
 *   GET /api/_ovok/schema
 */

interface NormalisedField {
  name: string
  type: string
  label: string | null
  required: boolean
  unique: boolean
  hasMany?: boolean
  relationTo?: string | string[]
  options?: Array<{ label: string; value: string }>
  fields?: NormalisedField[]
  description: string | null
}

interface NormalisedCollection {
  slug: string
  labels: { singular: string; plural: string }
  upload: boolean
  auth: boolean
  fields: NormalisedField[]
}

const stringifyLabel = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  return null
}

const normaliseField = (field: Field): NormalisedField | null => {
  const anyField = field as Record<string, unknown> & { type: string; name?: string }
  if (!anyField.name && !['row', 'collapsible', 'tabs', 'ui'].includes(anyField.type)) {
    return null
  }

  const base: NormalisedField = {
    name: (anyField.name as string) ?? anyField.type,
    type: anyField.type,
    label: stringifyLabel((anyField as { label?: unknown }).label),
    required: Boolean((anyField as { required?: boolean }).required),
    unique: Boolean((anyField as { unique?: boolean }).unique),
    description: stringifyLabel(((anyField as { admin?: { description?: unknown } }).admin ?? {}).description),
  }

  if (anyField.type === 'relationship' || anyField.type === 'upload') {
    base.relationTo = (anyField as { relationTo?: string | string[] }).relationTo
    base.hasMany = Boolean((anyField as { hasMany?: boolean }).hasMany)
  }

  if (anyField.type === 'select') {
    const rawOptions =
      (anyField as { options?: Array<string | { label: string; value: string }> }).options ?? []
    base.options = rawOptions.map((o) => (typeof o === 'string' ? { label: o, value: o } : o))
    base.hasMany = Boolean((anyField as { hasMany?: boolean }).hasMany)
  }

  if (['array', 'group', 'blocks'].includes(anyField.type)) {
    const subFields = ((anyField as { fields?: Field[] }).fields ?? [])
      .map(normaliseField)
      .filter((f): f is NormalisedField => f !== null)
    base.fields = subFields
  }

  return base
}

const normaliseCollection = (collection: SanitizedCollectionConfig): NormalisedCollection => ({
  slug: collection.slug,
  labels: {
    singular: stringifyLabel(collection.labels?.singular) ?? collection.slug,
    plural: stringifyLabel(collection.labels?.plural) ?? collection.slug,
  },
  upload: Boolean(collection.upload),
  auth: Boolean(collection.auth),
  fields: collection.fields
    .map(normaliseField)
    .filter((f): f is NormalisedField => f !== null),
})

/**
 * True when the collection has the `tenant` relationship field added by
 * `@payloadcms/plugin-multi-tenant`. Used to filter the schema response so
 * the dashboard only sees tenant-scoped content collections — never Payload
 * internals (`payload-kv`, `payload-locked-documents`, `payload-preferences`,
 * `payload-migrations`) or our own infra collections (`users`, `tenants`).
 *
 * Sources the list automatically from the plugin's runtime config so adding
 * a new collection to `multiTenantPlugin({ collections: { … } })` in
 * `payload.config.ts` makes it appear in the dashboard with no schema-side
 * change.
 */
const isTenantScopedCollection = (config: SanitizedCollectionConfig): boolean =>
  config.fields.some((field) => {
    const f = field as { type?: string; name?: string; relationTo?: string }
    return f.type === 'relationship' && f.name === 'tenant' && f.relationTo === 'tenants'
  })

export const schemaEndpoint: Endpoint = {
  // Lives at `/api/_ovok/schema`. Payload's `root: true` would only affect
  // Payload's internal routing, but the whole CMS is mounted at
  // `/api/[...slug]` by the Next.js app router — anything outside `/api/`
  // hits Next.js's 404. Callers (incl. the Ovok proxy) hit the `/api/`
  // path.
  path: '/_ovok/schema',
  method: 'get',
  handler: async ({ payload }) => {
    const collections = Object.values(payload.collections)
      .filter(({ config }) => isTenantScopedCollection(config))
      .map(({ config }) => normaliseCollection(config))

    return Response.json({ collections })
  },
}
