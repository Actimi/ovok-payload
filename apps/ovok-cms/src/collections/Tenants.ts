import type { CollectionConfig } from 'payload'

import { ovokInternalStrategy } from '../access/ovokInternal'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    create: () => true,
    delete: () => false,
    read: () => true,
    update: () => true,
  },
  admin: {
    useAsTitle: 'slug',
  },
  auth: {
    disableLocalStrategy: true,
    strategies: [ovokInternalStrategy],
  },
  fields: [
    {
      name: 'medplumProjectId',
      type: 'text',
      admin: { description: 'The Medplum top-level Project UUID. Identifies the tenant.' },
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      admin: { description: 'Human-readable code from src/tenant-code (Ovok backend).' },
      required: true,
      unique: true,
    },
    {
      name: 'active',
      type: 'checkbox',
      admin: { description: 'False when the project has disabled the CMS setting.' },
      defaultValue: true,
    },
  ],
  timestamps: true,
}
