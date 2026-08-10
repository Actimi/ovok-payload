import type { Access, CollectionConfig, Field } from 'payload'

/**
 * Defense in depth: the Ovok proxy is the only intended caller (it satisfies
 * the ovok-internal auth strategy), but if anything ever reaches Payload
 * without authenticating — leaked ALB route, misconfigured ingress — these
 * collections must not be readable or writable.
 */
const requireAuthenticated: Access = ({ req }) => Boolean(req.user)

export interface LocalizedContentCollectionOptions {
  /** Collection-specific fields, appended after the shared slug field. */
  fields: Field[]
  slug: string
  slugField?: {
    description: string
    required?: boolean
  }
}

/**
 * Shared shape of the first-class localized content collections
 * (carehub-product-roadmap#895): authenticated access, a slug, and the manual
 * draft/published `status` the public-delivery API filters on. Multi-tenancy
 * and environment scoping are applied centrally in payload.config.ts — a new
 * collection built with this factory only needs to be added to
 * CONTENT_COLLECTIONS there.
 */
export function createLocalizedContentCollection(
  options: LocalizedContentCollectionOptions,
): CollectionConfig {
  return {
    slug: options.slug,
    access: {
      create: requireAuthenticated,
      delete: requireAuthenticated,
      read: requireAuthenticated,
      update: requireAuthenticated,
    },
    admin: {
      useAsTitle: 'title',
    },
    fields: [
      {
        name: 'slug',
        type: 'text',
        admin: {
          description:
            options.slugField?.description ??
            'URL-safe identifier. Unique per tenant and environment when set.',
        },
        index: true,
        required: options.slugField?.required ?? false,
      },
      ...options.fields,
      {
        name: 'status',
        type: 'select',
        defaultValue: 'draft',
        index: true,
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
        ],
        required: true,
      },
    ],
    timestamps: true,
  }
}
