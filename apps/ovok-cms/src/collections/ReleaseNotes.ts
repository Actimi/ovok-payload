import type { CollectionConfig } from 'payload'

/**
 * First-class release-notes collection (carehub-product-roadmap#895).
 *
 * Replaces the AnnounceKit changelog feed. `title`/`excerpt`/`body` are
 * localized so one post carries every translation; reads pick a locale via
 * `?locale=` and fall back to the default locale. `tags` keeps AnnounceKit's
 * label/grouping concept alive. `publishedAt` is author-settable so migrated
 * posts keep their original dates — the history matters.
 *
 * Follows the `content-items` conventions: manual draft/published `status`
 * (the public-delivery API filters on it), multi-tenanted via the
 * `multiTenantPlugin` registration and environment-scoped via
 * `ovokEnvironmentPlugin` in payload.config.ts.
 */
export const ReleaseNotes: CollectionConfig = {
  slug: 'release-notes',
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
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description:
          'Optional URL-safe identifier for deep links. Unique per tenant and environment when set.',
      },
      index: true,
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Short summary shown in list views and the in-app "What\'s new" widget.',
      },
      localized: true,
    },
    {
      name: 'body',
      type: 'richText',
      localized: true,
    },
    {
      name: 'tags',
      type: 'select',
      admin: {
        description: 'Groupings carried over from the AnnounceKit labels.',
      },
      hasMany: true,
      options: [
        { label: 'Announcement', value: 'announcement' },
        { label: 'New', value: 'new' },
        { label: 'Improved', value: 'improved' },
        { label: 'Fixed', value: 'fixed' },
      ],
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
      name: 'publishedAt',
      type: 'date',
      admin: {
        description:
          'Publication date shown on the public changelog and used for ordering. Keep the original date on migrated posts.',
      },
      defaultValue: () => new Date().toISOString(),
      index: true,
      required: true,
    },
  ],
  timestamps: true,
}
