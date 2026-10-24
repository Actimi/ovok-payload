import { createLocalizedContentCollection } from './_shared/createLocalizedContentCollection'

/**
 * Blog posts for the website, served through ovok-core's public CMS delivery
 * (published only, `?locale=`). `title`/`excerpt`/`content` are localized so
 * one post carries every translation; `content` keeps its pre-localization
 * name for compatibility. Migrated in 20261017_000000_posts_localized.
 */
export const Posts = createLocalizedContentCollection({
  slug: 'posts',
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
        description: 'Short summary shown in list views.',
      },
      localized: true,
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
    },
    {
      name: 'media',
      type: 'relationship',
      hasMany: false,
      relationTo: 'media',
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        description: 'Publication date shown on the blog and used for ordering.',
      },
      defaultValue: () => new Date().toISOString(),
      index: true,
      required: true,
    },
  ],
  slugField: {
    description:
      'Stable URL-safe identifier the website links to, e.g. "hello-world". Unique per tenant and environment.',
    required: true,
  },
})
