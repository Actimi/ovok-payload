import type { CollectionConfig } from 'payload'

import { ovokInternalStrategy } from '../access/ovokInternal'

/**
 * Required by Payload (admin.user must reference a collection). Never
 * populated — authn comes entirely from Ovok via the internal strategy.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    create: () => false,
    delete: () => false,
    read: () => true,
    update: () => false,
  },
  auth: {
    disableLocalStrategy: true,
    strategies: [ovokInternalStrategy],
  },
  fields: [{ name: 'email', type: 'email' }],
}
