import type { CollectionConfig } from 'payload'

import { systemTenantAccess } from '../access/systemTenant'

/** Who has read which notice: one row per person and notice, so read state is personal. */
export const NotificationReads: CollectionConfig = {
  slug: 'notification-reads',
  access: systemTenantAccess,
  fields: [
    {
      name: 'notificationId',
      type: 'number',
      index: true,
      required: true,
    },
    {
      name: 'userId',
      type: 'text',
      admin: { description: 'The Medplum User id of the reader.' },
      required: true,
    },
  ],
  indexes: [{ fields: ['notificationId', 'userId'], unique: true }],
  timestamps: true,
}
