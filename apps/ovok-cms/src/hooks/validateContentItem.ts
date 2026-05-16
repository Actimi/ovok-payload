import type { CollectionBeforeChangeHook } from 'payload'

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
      const typeError = validateFieldType(field, value)
      if (typeError) {
        throw new Error(`"${field.label}": ${typeError}`)
      }

      if (field.unique) {
        const conflict = await req.payload.find({
          collection: 'content-items',
          where: {
            and: [
              { contentType: { equals: contentTypeId } },
              { [`data.${field.key}`]: { equals: value } },
              ...(operation === 'update' && originalDoc?.id
                ? [{ id: { not_equals: originalDoc.id } }]
                : []),
            ],
          },
          limit: 1,
          overrideAccess: true,
        })
        if (conflict.totalDocs > 0) {
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

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string' && value.trim() === '') return false
  if (Array.isArray(value) && value.length === 0) return false
  return true
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
