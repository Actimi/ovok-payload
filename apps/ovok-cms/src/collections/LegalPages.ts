import type { CollectionConfig } from 'payload'

/**
 * Legal/document pages (carehub-product-roadmap#895): Terms & Conditions,
 * Data Privacy, and similar long-lived pages that were interim-hosted on
 * AnnounceKit (easycarehub `legalLinks.ts` labels 95511/95512/95513).
 *
 * `slug` is the stable public identifier the dashboards link to
 * (e.g. `terms-and-conditions`, `data-privacy`) — unique per tenant and
 * environment via the ovokEnvironmentPlugin composite index. `title`/`body`
 * are localized. Same manual draft/published `status` convention as
 * `content-items`, so the public-delivery API serves only published pages.
 */
export const LegalPages: CollectionConfig = {
  slug: 'legal-pages',
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
    {
      name: 'slug',
      type: 'text',
      admin: {
        description:
          'Stable URL-safe identifier the dashboards link to, e.g. "terms-and-conditions". Unique per tenant and environment.',
      },
      index: true,
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      name: 'body',
      type: 'richText',
      localized: true,
    },
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
    {
      name: 'effectiveAt',
      type: 'date',
      admin: {
        description: 'Optional date this version of the document takes effect (shown on the page).',
      },
    },
  ],
  timestamps: true,
}
