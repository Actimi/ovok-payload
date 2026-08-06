import type { Endpoint, Field, SanitizedCollectionConfig } from 'payload'

import { SCHEMA_CACHE_CONTROL } from '@ovok/contracts'

/**
 * Returns a normalised description of every collection so the Ovok Dashboard
 * can render Payload-style CRUD forms without bundling Payload's admin UI.
 *
 * Reachable from outside the cluster via the Ovok proxy:
 *   GET /v1/content/_ovok/schema
 *
 * Direct access (inside the cluster, with internal-key header):
 *   GET /api/_ovok/schema
 */

interface NormalisedField {
  description: null | string
  fields?: NormalisedField[]
  hasMany?: boolean
  label: null | string
  /** True when the field stores one value per configured locale — the dashboard renders language tabs for it. */
  localized: boolean
  name: string
  options?: Array<{ label: string; value: string }>
  relationTo?: string | string[]
  required: boolean
  type: string
  unique: boolean
}

interface NormalisedCollection {
  auth: boolean
  fields: NormalisedField[]
  labels: { plural: string; singular: string }
  slug: string
  upload: boolean
}

const stringifyLabel = (value: unknown): null | string => {
  if (typeof value === 'string') {
    return value
  }
  return null
}

const normaliseField = (field: Field): NormalisedField | null => {
  const anyField = field as { name?: string; type: string } & Record<string, unknown>
  if (!anyField.name && !['collapsible', 'row', 'tabs', 'ui'].includes(anyField.type)) {
    return null
  }

  const base: NormalisedField = {
    name: (anyField.name as string) ?? anyField.type,
    type: anyField.type,
    description: stringifyLabel(
      ((anyField as { admin?: { description?: unknown } }).admin ?? {}).description,
    ),
    label: stringifyLabel((anyField as { label?: unknown }).label),
    localized: Boolean((anyField as { localized?: boolean }).localized),
    required: Boolean((anyField as { required?: boolean }).required),
    unique: Boolean((anyField as { unique?: boolean }).unique),
  }

  if (anyField.type === 'relationship' || anyField.type === 'upload') {
    base.relationTo = (anyField as { relationTo?: string | string[] }).relationTo
    base.hasMany = Boolean((anyField as { hasMany?: boolean }).hasMany)
  }

  if (anyField.type === 'select') {
    const rawOptions =
      (anyField as { options?: Array<{ label: string; value: string } | string> }).options ?? []
    base.options = rawOptions.map((o) => (typeof o === 'string' ? { label: o, value: o } : o))
    base.hasMany = Boolean((anyField as { hasMany?: boolean }).hasMany)
  }

  if (['array', 'blocks', 'group'].includes(anyField.type)) {
    const subFields = ((anyField as { fields?: Field[] }).fields ?? [])
      .map(normaliseField)
      .filter((f): f is NormalisedField => f !== null)
    base.fields = subFields
  }

  return base
}

const normaliseCollection = (collection: SanitizedCollectionConfig): NormalisedCollection => ({
  slug: collection.slug,
  auth: Boolean(collection.auth),
  fields: collection.fields.map(normaliseField).filter((f): f is NormalisedField => f !== null),
  labels: {
    plural: stringifyLabel(collection.labels?.plural) ?? collection.slug,
    singular: stringifyLabel(collection.labels?.singular) ?? collection.slug,
  },
  upload: Boolean(collection.upload),
})

export const schemaEndpoint: Endpoint = {
  handler: ({ payload }) => {
    const collections = Object.values(payload.collections)
      .filter(({ config }) => config.slug !== 'tenants' && config.slug !== 'users')
      .map(({ config }) => normaliseCollection(config))

    // Locale roster so the dashboard knows which language tabs to render for
    // `localized` fields and which locale reads fall back to.
    const localization = payload.config.localization
      ? {
          defaultLocale: payload.config.localization.defaultLocale,
          locales: payload.config.localization.localeCodes,
        }
      : null

    return Response.json(
      { collections, localization },
      { headers: { 'Cache-Control': SCHEMA_CACHE_CONTROL } },
    )
  },
  method: 'get',
  path: '/_ovok/schema',
}
