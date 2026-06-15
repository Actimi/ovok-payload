import type { CollectionConfig } from 'payload'

/**
 * User-defined content-type registry. Each row describes the shape of a
 * `content-items` document the dashboard editor will render a form for.
 *
 * Multi-tenanted via the `multiTenantPlugin` registration in
 * payload.config.ts — Payload injects the `tenant` relationship + the
 * tenant-scoped access checks at config-build time.
 *
 * `fields` is a typed array of "draft field" objects rather than a free-
 * form JSON blob so Payload's validator catches mis-shaped writes from
 * the dashboard at the boundary, not at item-form render time.
 */
export const ContentTypes: CollectionConfig = {
  slug: 'content-types',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Display name shown in the dashboard navigation.' },
    },
    {
      name: 'pluralName',
      type: 'text',
      required: true,
      admin: { description: 'Plural form, e.g. "Landing Contents". Used in list headings.' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'URL-safe identifier used in `/v1/public/cms/<slug>/items`. Lowercase, hyphenated, unique per tenant.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'fields',
      type: 'array',
      label: 'Item fields',
      admin: {
        description: 'Field definitions the item editor will render. Each entry becomes one input in the item form.',
      },
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
          admin: { description: 'Programmatic identifier the public-delivery API exposes (snake_case or camelCase).' },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Text (single line)', value: 'text' },
            { label: 'Textarea (multi-line)', value: 'textarea' },
            { label: 'Rich text', value: 'richtext' },
            { label: 'Number', value: 'number' },
            { label: 'Checkbox', value: 'checkbox' },
            { label: 'Date', value: 'date' },
            { label: 'Select', value: 'select' },
            { label: 'Media', value: 'media' },
            { label: 'Relationship', value: 'relationship' },
          ],
        },
        { name: 'required', type: 'checkbox', defaultValue: false },
        { name: 'unique', type: 'checkbox', defaultValue: false },
        { name: 'hasMany', type: 'checkbox', defaultValue: false },
        { name: 'description', type: 'text' },
        {
          name: 'relationTo',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'relationship',
            description: 'Slug of the target content type (for relationship fields).',
          },
        },
        {
          name: 'localized',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description:
              'When true, the item editor stores per-locale values and the public-delivery API falls back to the project default locale.',
          },
        },
        {
          name: 'options',
          type: 'array',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'select',
            description: 'Allowed values for select fields.',
          },
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'value', type: 'text', required: true },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
