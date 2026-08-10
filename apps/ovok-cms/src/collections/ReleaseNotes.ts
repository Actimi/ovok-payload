import { createLocalizedContentCollection } from './_shared/createLocalizedContentCollection'

/**
 * Release-notes collection (carehub-product-roadmap#895) — replaces the
 * AnnounceKit changelog feed. `title`/`excerpt`/`body` are localized so one
 * post carries every translation; `tags` keeps AnnounceKit's label/grouping
 * concept alive; `publishedAt` is author-settable so migrated posts keep
 * their original dates — the history matters.
 */
export const ReleaseNotes = createLocalizedContentCollection({
  slug: 'release-notes',
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
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
  slugField: {
    description:
      'Optional URL-safe identifier for deep links. Unique per tenant and environment when set.',
  },
})
