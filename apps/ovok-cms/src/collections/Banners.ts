import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { createLocalizedContentCollection } from './_shared/createLocalizedContentCollection'

/**
 * At most one banner may be PUBLISHED per tenant and environment at a time
 * (carehub-product-roadmap#1705): the dashboard shows a single customer banner, so publishing one
 * auto-demotes every other published banner (same tenant + environment) to draft — last-publish-wins.
 * The demoted banners are kept as drafts, not deleted, so an author can re-publish one later.
 *
 * Runs after the change in the same request/transaction, so no reader ever observes two published
 * banners. Setting the others to `draft` re-fires this hook for them, but the `published` guard makes
 * that a no-op, so there is no recursion.
 */
const unpublishOtherBanners: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (doc.status !== 'published') {
    return doc
  }
  const tenantId = typeof doc.tenant === 'object' && doc.tenant ? doc.tenant.id : doc.tenant
  if (tenantId == null) {
    return doc
  }

  await req.payload.update({
    collection: 'banners',
    where: {
      and: [
        { id: { not_equals: doc.id } },
        { status: { equals: 'published' } },
        { tenant: { equals: tenantId } },
        { environment: { equals: doc.environment } },
      ],
    },
    data: { status: 'draft' },
    req,
    overrideAccess: true,
  })

  return doc
}

/**
 * Customer banners (carehub-product-roadmap#1705): a short announcement shown
 * to every customer in the dashboard. Same authoring shape as a legal page — a
 * localized `title` + rich-text `body` (the survey link lives inside the body as
 * an ordinary hyperlink) — plus `startDate`/`endDate`. Publishing is the start
 * signal: a published banner shows immediately and stays up until its `endDate`
 * passes, then hides automatically. `startDate` does not gate visibility — it is
 * only the window text, rendered via the {{startDate}} token.
 */
const banners = createLocalizedContentCollection({
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
      admin: {
        description:
          "Shown in the banner. Use {{startDate}} / {{endDate}} to display the start/end in each viewer's local time.",
      },
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        description:
          'When the maintenance begins — shown in the banner text. It does not control when the banner appears: a published banner shows immediately, until the end date.',
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

export const Banners: CollectionConfig = {
  ...banners,
  hooks: {
    ...banners.hooks,
    afterChange: [...(banners.hooks?.afterChange ?? []), unpublishOtherBanners],
  },
}
