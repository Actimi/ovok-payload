import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: () => true,
    delete: () => true,
    read: () => true,
    update: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
  upload: {
    staticDir: 'media',
  },
}
