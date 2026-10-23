import { EmailTemplates } from './EmailTemplates'
import { NotificationReads } from './NotificationReads'
import { Notifications } from './Notifications'

/** Platform records, kept in the system tenant: tenant- and environment-scoped like content, never in the dashboard's schema. */
export const SYSTEM_COLLECTIONS = [EmailTemplates, Notifications, NotificationReads]

export const SYSTEM_COLLECTION_SLUGS = SYSTEM_COLLECTIONS.map((collection) => collection.slug)
