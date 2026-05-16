import type { CollectionConfig } from 'payload'

/**
 * Tenant-owned transactional email template.
 *
 * Each row pairs a stable `key` (e.g. `practitioner-invite`,
 * `password-reset`) with a renderable subject + body. The Ovok backend's
 * EmailService looks up a template by (tenant, key), substitutes
 * `{{var}}` placeholders against the caller-supplied variables, and
 * hands the rendered HTML + text to MailingService. When no template
 * is found — or `enabled` is false — the legacy Brevo template flow is
 * used instead, so existing projects keep working unchanged.
 *
 * Multi-tenant scoped via the plugin: the `tenant` relationship field
 * is added automatically, and per-tenant key uniqueness is enforced
 * here in beforeChange (same pattern as ContentTypes slug).
 */
export const EmailTemplates: CollectionConfig = {
  slug: 'email-templates',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'key', 'enabled', 'updatedAt'],
  },
  // Hot path is `find({ where: { tenant, key } })` from the Ovok
  // backend at send-time. The multi-tenant plugin auto-indexes
  // `tenant`; pair it with `key` for the composite lookup.
  indexes: [{ fields: ['tenant', 'key'] }],
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      admin: {
        description:
          'Stable identifier the backend uses to resolve this template. Lowercase, alphanumeric + dash. Examples: practitioner-invite, password-reset.',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Display name shown in the dashboard list.' },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description:
          'Optional. Notes about when this template fires and which variables it expects.',
      },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      admin: {
        description:
          'Email subject line. Supports {{variable}} placeholders, substituted at send-time.',
      },
    },
    {
      name: 'bodyHtml',
      type: 'textarea',
      required: true,
      admin: {
        description:
          'HTML body. Supports {{variable}} placeholders. Keep inline styles — most clients strip <style> tags.',
      },
    },
    {
      name: 'bodyText',
      type: 'textarea',
      admin: {
        description:
          'Plain-text fallback. Optional but strongly recommended — some clients render text-only.',
      },
    },
    {
      name: 'fromOverride',
      type: 'text',
      admin: {
        description:
          'Optional sender override. Leave blank to use the system default (MAIL_FROM).',
      },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'When off, the backend falls back to the legacy template flow for this key.',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (typeof data.key === 'string') {
          data.key = data.key
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '')
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        // Per-tenant uniqueness on `key`. The multi-tenant plugin
        // injects `tenant`; reject duplicates inside the same tenant.
        if (typeof data.key === 'string' && data.tenant) {
          const conflict = await req.payload.find({
            collection: 'email-templates',
            where: {
              and: [
                { key: { equals: data.key } },
                { tenant: { equals: data.tenant } },
                ...(operation === 'update' && originalDoc?.id
                  ? [{ id: { not_equals: originalDoc.id } }]
                  : []),
              ],
            },
            limit: 1,
            overrideAccess: true,
          })
          if (conflict.totalDocs > 0) {
            throw new Error(`An email template with key "${data.key}" already exists.`)
          }
        }
        return data
      },
    ],
  },
  // Same rationale as ContentItems: editors revise templates over
  // time and recovering "what did last week's invite look like" is
  // genuinely useful. Bounded so the table doesn't grow forever.
  versions: {
    maxPerDoc: 50,
  },
  timestamps: true,
}
