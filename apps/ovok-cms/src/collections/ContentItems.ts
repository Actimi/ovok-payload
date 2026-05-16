import type { CollectionConfig } from 'payload'

import { validateItemAgainstContentType } from '../hooks/validateContentItem'

/**
 * One row per stored item. Shape is defined at runtime by the referenced
 * content-type (see {@link ContentTypes}). All editable values land in the
 * `data` JSON column so we don't need a build-time schema per content
 * type — the dashboard renders forms from the content-type definition and
 * we validate the submitted data here.
 *
 * Multi-tenant scoped via the plugin.
 */
export const ContentItems: CollectionConfig = {
  slug: 'content-items',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'contentType', 'status', 'updatedAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'contentType',
      type: 'relationship',
      relationTo: 'content-types',
      required: true,
      admin: {
        description:
          'Determines which fields this item carries. Cannot change after creation.',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description:
          'A short display title. Shown in lists and pickers. Defaults to the first text field if empty.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description: 'Optional URL-safe identifier for this item.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    {
      name: 'data',
      type: 'json',
      admin: {
        description:
          'The actual field values, keyed by the content-type field.key. Validated against the content-type schema before save.',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (typeof data.slug === 'string') {
          data.slug = data.slug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '')
        }
        return data
      },
    ],
    beforeChange: [validateItemAgainstContentType],
  },
  // Per-document revision history. We deliberately keep `drafts: false`
  // here: ContentItems already has an explicit `status` field that's part
  // of the application's publishing model. Layering Payload's separate
  // draft/published state on top would create two competing meanings of
  // "is this published?" — instead we just collect a version on every
  // save so editors can review + restore a previous revision.
  //
  // maxPerDoc bounds storage growth — keep 50 most recent versions per
  // item. Realistically editors revise an item far less than that, but
  // long-lived content (legal pages, FAQs) can churn over years.
  versions: {
    maxPerDoc: 50,
  },
  timestamps: true,
}
