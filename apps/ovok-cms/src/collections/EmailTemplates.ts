import type { CollectionConfig } from 'payload'

import { systemTenantAccess } from '../access/systemTenant'

/**
 * Platform mail (verify email, forgot password, webhook disabled) that ovok-core renders
 * with Handlebars and sends itself. Kept in the system tenant, so no project's
 * templates or branding ever reach a SaaS mail. One document per mail, localized.
 */
export const EmailTemplates: CollectionConfig = {
  slug: 'email-templates',
  access: systemTenantAccess,
  admin: { useAsTitle: 'slug' },
  fields: [
    {
      name: 'slug',
      type: 'text',
      admin: { description: 'The mail it renders, e.g. "verify-email". Unique per environment.' },
      index: true,
      required: true,
    },
    {
      name: 'subject',
      type: 'text',
      admin: { description: 'A Handlebars template, e.g. "Verify your email, {{firstName}}".' },
      localized: true,
      required: true,
    },
    {
      name: 'html',
      type: 'textarea',
      admin: { description: 'The HTML body, a Handlebars template.' },
      localized: true,
      required: true,
    },
    {
      name: 'text',
      type: 'textarea',
      admin: { description: 'The plain-text body, for clients that show no HTML.' },
      localized: true,
    },
  ],
  timestamps: true,
}
