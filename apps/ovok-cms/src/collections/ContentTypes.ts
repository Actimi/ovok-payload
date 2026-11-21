import type { CollectionConfig } from 'payload'

import { APIError } from 'payload'

/**
 * Payload coerces a non-array `fields` to `[]` during field sanitization, which
 * would store a mis-shaped write as "no fields" behind a 201. Refuse it on the
 * raw body instead, before that runs.
 */
const assertFieldDefinitions = (value: unknown): void => {
  if (value === undefined || value === null) {
    return
  }
  const isDefinition = (entry: unknown) =>
    typeof entry === 'object' && entry !== null && !Array.isArray(entry)
  if (!Array.isArray(value) || !value.every(isDefinition)) {
    throw new APIError(
      'Item fields must be a list of field definitions, e.g. [{ "key": "headline", "label": "Headline", "type": "text" }].',
      422,
      null,
      true,
    )
  }
}

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
  access: {
    create: () => true,
    delete: () => true,
    read: () => true,
    update: () => true,
  },
  admin: {
    useAsTitle: 'name',
  },
  hooks: {
    beforeOperation: [
      (args) => {
        // Operations that carry no body leave `data` undefined, which the guard passes.
        const { data } = args.args as unknown as { data?: { fields?: unknown } }
        assertFieldDefinitions(data?.fields)
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      admin: { description: 'Display name shown in the dashboard navigation.' },
      required: true,
    },
    {
      name: 'pluralName',
      type: 'text',
      admin: { description: 'Plural form, e.g. "Landing Contents". Used in list headings.' },
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description:
          'URL-safe identifier used in `/v1/public/cms/<slug>/items`. Lowercase, hyphenated, unique per tenant.',
      },
      index: true,
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'public',
      type: 'checkbox',
      admin: {
        description:
          'When on, anyone may read this type\u2019s published items at `/v1/public/cms/<slug>/items` with no API key and no sign-in. Leave off to require one.',
      },
      defaultValue: false,
      label: 'Public',
    },
    {
      name: 'fields',
      type: 'array',
      admin: {
        description:
          'Field definitions the item editor will render. Each entry becomes one input in the item form.',
      },
      fields: [
        {
          name: 'key',
          type: 'text',
          admin: {
            description:
              'Programmatic identifier the public-delivery API exposes (snake_case or camelCase).',
          },
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'type',
          type: 'select',
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
          required: true,
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
          admin: {
            description:
              'When true, the item editor stores per-locale values and the public-delivery API falls back to the project default locale.',
          },
          defaultValue: false,
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
      label: 'Item fields',
    },
  ],
  timestamps: true,
}
