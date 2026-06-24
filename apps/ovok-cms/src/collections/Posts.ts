import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
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
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'content', type: 'richText' },
    { name: 'media', type: 'relationship', hasMany: false, relationTo: 'media' },
    { name: 'publishedAt', type: 'date' },
  ],
  timestamps: true,
}
