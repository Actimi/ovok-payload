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
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'contentType',
      type: 'relationship',
      relationTo: 'content-types',
      required: true,
      hasMany: false,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      admin: { description: 'Optional URL-safe identifier. Unique per content-type per tenant when set.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      index: true,
    },
    {
      name: 'data',
      type: 'json',
      required: true,
      admin: {
        description:
          'Field values keyed by the content-type field `key`. The dashboard renders the right input per field-type; the public-delivery API returns this object verbatim.',
      },
    },
  ],
  timestamps: true,
}
