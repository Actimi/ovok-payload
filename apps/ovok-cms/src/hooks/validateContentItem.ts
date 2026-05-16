import { sql } from 'drizzle-orm'
import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'

interface ContentTypeField {
  key: string
  label: string
  type:
    | 'text'
    | 'textarea'
    | 'richtext'
    | 'number'
    | 'checkbox'
    | 'date'
    | 'select'
    | 'media'
    | 'relationship'
  required?: boolean
  unique?: boolean
  hasMany?: boolean
  options?: { label: string; value: string }[]
  /** For `relationship` fields: the slug of the target content type. */
  relationTo?: string
  /** When true the value is `{ [locale]: <perLocaleValue> }`. */
  localized?: boolean
}

interface ContentTypeDoc {
  id: string | number
  name: string
  slug: string
  fields?: ContentTypeField[]
}

/**
 * Validates a content-item's `data` against its content-type's `fields[]`
 * schema. Runs on every create + update. Fails fast with a clear message
 * — Payload surfaces this as a 400 to the dashboard, which renders it on
 * the form.
 *
 * Checks per field:
 *   • required: a present, non-empty value
 *   • type:     value type matches the field type
 *   • unique:   no other item in this content type (same tenant scope, by
 *               virtue of multi-tenant access) has the same value
 *
 * Stops at the first failure to keep messages actionable for non-tech
 * editors ("Title is required" beats a wall of errors).
 */
export const validateItemAgainstContentType: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  if (!data) return data

  const contentTypeRef = data.contentType
  if (!contentTypeRef) {
    throw new Error('contentType is required.')
  }
  const contentTypeId =
    typeof contentTypeRef === 'object' && contentTypeRef !== null
      ? (contentTypeRef as { id?: string | number }).id
      : contentTypeRef

  if (!contentTypeId) {
    throw new Error('contentType is required.')
  }

  // Disallow re-pointing an existing item at a different content type — the
  // data shape would no longer match.
  if (operation === 'update' && originalDoc) {
    const orig = originalDoc as { contentType?: { id?: string | number } | string | number }
    const origId =
      typeof orig.contentType === 'object' && orig.contentType !== null
        ? orig.contentType.id
        : orig.contentType
    if (origId && String(origId) !== String(contentTypeId)) {
      throw new Error("An item's contentType cannot be changed after creation.")
    }
  }

  const ct = (await req.payload.findByID({
    collection: 'content-types',
    id: contentTypeId as string,
    depth: 0,
    overrideAccess: true,
  })) as ContentTypeDoc | null

  if (!ct) {
    throw new Error('Referenced content type does not exist.')
  }

  const fields = ct.fields ?? []
  const payload = (data.data ?? {}) as Record<string, unknown>

  for (const field of fields) {
    const value = payload[field.key]
    const present = isPresent(value)

    if (field.required && !present) {
      throw new Error(`"${field.label}" is required.`)
    }

    if (present) {
      // Localized: each locale's value is validated through the
      // single-value validator. Required passes when at least one
      // locale is filled (already enforced above).
      if (field.localized && isLocalizedShape(value)) {
        for (const [locale, inner] of Object.entries(value as Record<string, unknown>)) {
          if (!isPresent(inner)) continue
          const typeError = validateFieldType(field, inner)
          if (typeError) {
            throw new Error(`"${field.label}" (${locale}): ${typeError}`)
          }
        }

        // Unique on localized fields is enforced PER LOCALE: each
        // locale slot is its own uniqueness column. Two items can
        // share an English value if their German values differ. This
        // matches editorial intent (each translation of a page is
        // independently a slug / title), and the query is cheap —
        // one Payload `find` per locale, gated by `field.unique`.
        if (field.unique) {
          for (const [locale, inner] of Object.entries(value as Record<string, unknown>)) {
            if (!isPresent(inner)) continue
            const collision = await existsByContainment(req, {
              contentTypeId,
              containment: { [field.key]: { [locale]: inner } },
              excludeId: operation === 'update' ? originalDoc?.id : undefined,
            })
            if (collision) {
              throw new Error(
                `"${field.label}" (${locale}) must be unique. Another item already uses this value.`,
              )
            }
          }
        }
        continue
      }

      const typeError = validateFieldType(field, value)
      if (typeError) {
        throw new Error(`"${field.label}": ${typeError}`)
      }

      if (field.unique) {
        const collision = await existsByContainment(req, {
          contentTypeId,
          containment: { [field.key]: value },
          excludeId: operation === 'update' ? originalDoc?.id : undefined,
        })
        if (collision) {
          throw new Error(`"${field.label}" must be unique. Another item already uses this value.`)
        }
      }
    }
  }

  // If `title` is empty, fall back to the first text-ish field value so list
  // views always have something to show.
  if (!isPresent(data.title)) {
    const firstText = fields.find(
      (f) => f.type === 'text' || f.type === 'textarea',
    )
    const candidate = firstText ? payload[firstText.key] : undefined
    if (typeof candidate === 'string' && candidate.trim()) {
      data.title = candidate.trim().slice(0, 120)
    }
  }

  return data
}

/**
 * Containment-based uniqueness check that USES the GIN index.
 *
 * Payload's `find({ where: { 'data.foo.bar': { equals: x } } })` generates
 * a path-extraction equality (`data->'foo'->>'bar' = '...'`) which the
 * GIN index can't accelerate; the planner falls back to a seq scan over
 * every row matching content_type_id. For tables of any meaningful
 * size that's wasteful even with the (content_type_id, status) btree
 * narrowing.
 *
 * Switching to `data @> '{"foo":{"bar":"x"}}'::jsonb` lets Postgres
 * use the `content_items_data_gin_path` index (jsonb_path_ops) directly:
 * one indexed lookup instead of a scan. The (content_type_id) filter
 * still narrows so a tenant with many content types pays per-type.
 *
 * Containment on primitive scalars (string / number / bool) is exact
 * equality at the matched path, which is what `unique:true` wants.
 * For richtext / media / relationship fields, `unique:true` is either
 * disallowed by the schema (richtext) or doesn't make sense to enforce
 * here; the builder UI gates that.
 */
async function existsByContainment(
  req: PayloadRequest,
  args: {
    contentTypeId: string | number
    containment: Record<string, unknown>
    excludeId?: string | number
  },
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drizzle = (req.payload.db as any).drizzle as
    | { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }> }
    | undefined
  if (!drizzle?.execute) {
    // Safety net: if drizzle isn't available (unexpected at runtime),
    // fall back to Payload's filter so uniqueness is still enforced —
    // just slower. We never silently skip the check.
    const fallback = await req.payload.find({
      collection: 'content-items',
      where: {
        and: [
          { contentType: { equals: args.contentTypeId } },
          ...Object.entries(args.containment).flatMap(([k, v]) =>
            v !== null && typeof v === 'object'
              ? Object.entries(v as Record<string, unknown>).map(([k2, v2]) => ({
                  [`data.${k}.${k2}`]: { equals: v2 },
                }))
              : [{ [`data.${k}`]: { equals: v } }],
          ),
          ...(args.excludeId !== undefined ? [{ id: { not_equals: args.excludeId } }] : []),
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    return fallback.totalDocs > 0
  }

  const containmentJson = JSON.stringify(args.containment)
  // Two query shapes — with and without excludeId — kept separate so
  // the planner can prepare each independently and so the empty
  // sql`` template doesn't appear when there's no exclude.
  const result =
    args.excludeId !== undefined
      ? await drizzle.execute(sql`
          SELECT 1
          FROM content_items
          WHERE content_type_id = ${args.contentTypeId}
            AND data @> ${containmentJson}::jsonb
            AND id <> ${args.excludeId}
          LIMIT 1
        `)
      : await drizzle.execute(sql`
          SELECT 1
          FROM content_items
          WHERE content_type_id = ${args.contentTypeId}
            AND data @> ${containmentJson}::jsonb
          LIMIT 1
        `)
  return (result.rows ?? []).length > 0
}

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string' && value.trim() === '') return false
  if (Array.isArray(value) && value.length === 0) return false
  return true
}

/**
 * Cheap shape check for `{ [locale]: value }`. The validator uses this
 * to decide whether to walk per-locale or apply single-value rules.
 * We don't try to validate locale codes themselves — Medplum-style
 * BCP-47 strings vary too widely; a wrong-locale value just won't be
 * surfaced by the dashboard's matching public-delivery resolver.
 */
function isLocalizedShape(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value as Record<string, unknown>)
  if (keys.length === 0) return false
  return keys.some((k) => /^[a-z]{2,3}(-[A-Z]{2,4})?$/.test(k))
}

function validateFieldType(field: ContentTypeField, value: unknown): string | null {
  switch (field.type) {
    case 'text':
    case 'textarea':
      return typeof value === 'string' ? null : 'must be a string.'
    case 'richtext':
      // Lexical state is an object with { root: {...} }. We accept any object
      // for now; Lexical's own validators run separately on the rich-text
      // payload.
      return typeof value === 'object' && value !== null ? null : 'must be rich text.'
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? null
        : 'must be a number.'
    case 'checkbox':
      return typeof value === 'boolean' ? null : 'must be true or false.'
    case 'date': {
      if (typeof value !== 'string') return 'must be an ISO date string.'
      const d = new Date(value)
      return Number.isNaN(d.getTime()) ? 'is not a valid date.' : null
    }
    case 'select': {
      const options = (field.options ?? []).map((o) => o.value)
      const values = Array.isArray(value) ? value : [value]
      const allValid = values.every(
        (v) => typeof v === 'string' && options.includes(v),
      )
      if (!allValid) return 'has an unsupported option value.'
      if (!field.hasMany && Array.isArray(value)) {
        return 'expects a single value, not a list.'
      }
      return null
    }
    case 'media': {
      const ids = Array.isArray(value) ? value : [value]
      const allValid = ids.every(
        (v) =>
          typeof v === 'string' ||
          typeof v === 'number' ||
          (typeof v === 'object' && v !== null && 'id' in (v as object)),
      )
      if (!allValid) return 'must reference a media item by id.'
      if (!field.hasMany && Array.isArray(value)) {
        return 'expects a single media item, not a list.'
      }
      return null
    }
    case 'relationship': {
      // Shape-only validation: target ids must be primitive (or
      // expanded {id} objects from a depth>0 read). Cross-tenant /
      // wrong-collection enforcement happens at read-time by the
      // multi-tenant plugin's access functions, so we don't re-query
      // here.
      const ids = Array.isArray(value) ? value : [value]
      const allValid = ids.every(
        (v) =>
          typeof v === 'string' ||
          typeof v === 'number' ||
          (typeof v === 'object' && v !== null && 'id' in (v as object)),
      )
      if (!allValid) return 'must reference an item by id.'
      if (!field.hasMany && Array.isArray(value)) {
        return 'expects a single related item, not a list.'
      }
      return null
    }
    default:
      return null
  }
}
