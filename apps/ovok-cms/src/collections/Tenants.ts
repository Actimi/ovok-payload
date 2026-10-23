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
      name: 'kind',
      type: 'select',
      admin: {
        description: 'project: a Medplum project. system: the one tenant holding platform records.',
      },
      defaultValue: 'project',
      index: true,
      options: ['project', 'system'],
      required: true,
    },
    {
      name: 'medplumProjectId',
      type: 'text',
      admin: { description: 'The Medplum top-level Project UUID. Identifies a project tenant.' },
      index: true,
      unique: true,
      validate: (
        value: null | string | undefined,
        { siblingData }: { siblingData: { kind?: string } },
      ) =>
        siblingData?.kind === 'system' ||
        Boolean(value) ||
        'A project tenant needs its medplumProjectId.',
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
