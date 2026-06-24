import type { CollectionConfig } from 'payload'

/**
 * Actual content rows authored against a `content-types` definition.
 * The `data` field is a typed JSON blob the dashboard editor populates
 * from the type's `fields` schema. The public-delivery API serialises
 * each row at `/v1/public/cms/<contentType.slug>/items` filtered by
 * `where[status][equals]=published`.
 *
 * Multi-tenanted via the `multiTenantPlugin` registration in
 * payload.config.ts.
 */
export const ContentItems: CollectionConfig = {
  slug: 'content-items',
  access: {
    create: () => true,
    delete: () => true,
    read: () => true,
    update: () => true,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'contentType',
      type: 'relationship',
      hasMany: false,
      index: true,
      relationTo: 'content-types',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description: 'Optional URL-safe identifier. Unique per content-type per tenant when set.',
      },
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      required: true,
    },
    {
      name: 'data',
      type: 'json',
      admin: {
        description:
          'Field values keyed by the content-type field `key`. The dashboard renders the right input per field-type; the public-delivery API returns this object verbatim.',
      },
      required: true,
    },
  ],
  timestamps: true,
}
