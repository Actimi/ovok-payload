import type { CollectionConfig } from 'payload'

import { systemTenantAccess } from '../access/systemTenant'

/**
 * Notices to a project's people, such as a disabled webhook endpoint. Every project's
 * notices live in the system tenant; ovok-core scopes each read to the caller's project.
 */
export const Notifications: CollectionConfig = {
  slug: 'notifications',
  access: systemTenantAccess,
  admin: { useAsTitle: 'title' },
  fields: [
    {
      name: 'medplumProjectId',
      type: 'text',
      admin: { description: 'The project the notice is for.' },
      index: true,
      required: true,
    },
    {
      name: 'kind',
      type: 'text',
      admin: { description: 'What happened, e.g. "webhook.disabled".' },
      index: true,
      required: true,
    },
    {
      name: 'severity',
      type: 'select',
      defaultValue: 'info',
      options: ['info', 'warning', 'error'],
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'textarea',
    },
    {
      name: 'data',
      type: 'json',
      admin: { description: 'The facts behind the notice, for links and details.' },
    },
    {
      name: 'audience',
      type: 'text',
      admin: { description: '"admins" for the project\'s admins, or one Medplum User id.' },
      defaultValue: 'admins',
      required: true,
    },
    {
      name: 'dedupKey',
      type: 'text',
      admin: {
        description: 'The event it came from, e.g. a Signals webhook-id; a repeat is refused.',
      },
      unique: true,
    },
  ],
  indexes: [{ fields: ['medplumProjectId', 'createdAt'] }],
  timestamps: true,
}
