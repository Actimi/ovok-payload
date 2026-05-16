import type { CollectionConfig } from 'payload'

/**
 * Tenant-defined content type. Replaces hardcoded collections like `posts`
 * with a runtime schema each tenant builds themselves. Items are stored in
 * the `content-items` collection with a `data` JSON column shaped by the
 * `fields[]` array here. The dashboard renders create/edit forms by walking
 * this array — no hardcoded UI per content type.
 *
 * Multi-tenant scoped via the plugin: each row is owned by exactly one
 * tenant (Medplum project). The plugin adds the `tenant` relationship
 * field automatically.
 */
export const ContentTypes: CollectionConfig = {
  slug: 'content-types',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'description', 'updatedAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Singular display name. Example: "FAQ entry".' },
    },
    {
      name: 'pluralName',
      type: 'text',
      required: true,
      admin: { description: 'Plural display name. Example: "FAQ entries".' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      // No global unique — tenants might pick overlapping slugs. Uniqueness
      // is enforced per-tenant by a beforeChange hook (see below) which has
      // access to req.user's tenant id.
      admin: {
        description:
          'URL-safe identifier. Used in dashboard routes (/content/<slug>). Lowercase, no spaces.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Optional. Shown to editors on the content type card.' },
    },
    {
      name: 'fields',
      type: 'array',
      label: 'Fields',
      labels: { singular: 'Field', plural: 'Fields' },
      admin: {
        description:
          'Each entry becomes one input on the item form. Field key must be unique inside a content type.',
      },
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
          admin: {
            description:
              'Identifier used in the item data object. Lowercase, alphanumeric + underscore.',
          },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: { description: 'Shown above the input in the dashboard.' },
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'text',
          options: [
            { label: 'Text (single line)', value: 'text' },
            { label: 'Textarea (multi-line)', value: 'textarea' },
            { label: 'Rich text', value: 'richtext' },
            { label: 'Number', value: 'number' },
            { label: 'Checkbox (yes/no)', value: 'checkbox' },
            { label: 'Date', value: 'date' },
            { label: 'Select (from options)', value: 'select' },
            { label: 'Media (image / file)', value: 'media' },
          ],
        },
        {
          name: 'required',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'unique',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description:
              'No two items in this content type can have the same value for this field. Enforced per-tenant.',
          },
        },
        {
          name: 'hasMany',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description:
              'For select and media: allow multiple values. Ignored for other types.',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          admin: { description: 'Helper text shown under the field on the form.' },
        },
        {
          name: 'options',
          type: 'array',
          admin: {
            description: 'Only used when type = "Select". Define the choices an editor can pick.',
          },
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'value', type: 'text', required: true },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        // Normalise slug + field keys to lowercase / alphanumeric-underscore.
        if (typeof data.slug === 'string') {
          data.slug = data.slug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '')
        }
        if (Array.isArray(data.fields)) {
          for (const f of data.fields) {
            if (typeof f?.key === 'string') {
              f.key = f.key
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_]+/g, '_')
                .replace(/^_+|_+$/g, '')
            }
          }
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        // Per-tenant slug uniqueness. The multi-tenant plugin adds `tenant`
        // automatically; we just check no other content-type in this tenant
        // already uses the slug.
        if (typeof data.slug === 'string' && data.tenant) {
          const conflict = await req.payload.find({
            collection: 'content-types',
            where: {
              and: [
                { slug: { equals: data.slug } },
                { tenant: { equals: data.tenant } },
                ...(operation === 'update' && originalDoc?.id
                  ? [{ id: { not_equals: originalDoc.id } }]
                  : []),
              ],
            },
            limit: 1,
            overrideAccess: true,
          })
          if (conflict.totalDocs > 0) {
            throw new Error(`A content type with slug "${data.slug}" already exists.`)
          }
        }
        // Field keys must be unique within a content type.
        if (Array.isArray(data.fields)) {
          const keys = data.fields.map((f: { key?: string }) => f?.key).filter(Boolean)
          const dupes = keys.filter((k, i) => keys.indexOf(k) !== i)
          if (dupes.length > 0) {
            throw new Error(`Duplicate field key(s): ${[...new Set(dupes)].join(', ')}`)
          }
        }
        return data
      },
    ],
  },
  timestamps: true,
}
