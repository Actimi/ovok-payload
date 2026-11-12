import { createLocalizedContentCollection } from './_shared/createLocalizedContentCollection'

/**
 * Customer banners (carehub-product-roadmap#1705): a short announcement shown
 * to every customer in the dashboard for a configurable window. Same authoring
 * shape as a legal page — a localized `title` + rich-text `body` (the survey
 * link lives inside the body as an ordinary hyperlink) — plus the `startDate`/
 * `endDate` that bound when it is displayed. The dashboard lists the published
 * banners and shows the one whose window contains "now"; past `endDate` it
 * hides automatically.
 */
export const Banners = createLocalizedContentCollection({
  slug: 'banners',
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
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        description: 'When the banner starts being shown to customers.',
      },
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      admin: {
        description: 'When the banner stops being shown. After this it is hidden automatically.',
      },
    },
  ],
  slugField: {
    description: 'Optional URL-safe identifier for the banner. Unique per tenant and environment when set.',
  },
})
