import { createLocalizedContentCollection } from './_shared/createLocalizedContentCollection'

/**
 * Legal/document pages (carehub-product-roadmap#895): Terms & Conditions,
 * Data Privacy, and similar long-lived pages that were interim-hosted on
 * AnnounceKit (easycarehub `legalLinks.ts` labels 95511/95512/95513).
 * `slug` is the stable public identifier the dashboards link to
 * (e.g. `terms-and-conditions`, `data-privacy`).
 */
export const LegalPages = createLocalizedContentCollection({
  slug: 'legal-pages',
  fields: [
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
      name: 'effectiveAt',
      type: 'date',
      admin: {
        description: 'Optional date this version of the document takes effect (shown on the page).',
      },
    },
  ],
  slugField: {
    description:
      'Stable URL-safe identifier the dashboards link to, e.g. "terms-and-conditions". Unique per tenant and environment.',
    required: true,
  },
})
