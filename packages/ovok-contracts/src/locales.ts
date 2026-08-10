import { z } from 'zod'

/**
 * Locale roster of the CMS (carehub-product-roadmap#895). Single source of
 * truth for ovok-cms's payload.config.ts localization block and any consumer
 * that needs to know which languages content can carry.
 *
 * Adding a locale is additive-only: extend this tuple AND ship an
 * `ALTER TYPE "_locales" ADD VALUE IF NOT EXISTS '<code>'` migration in
 * ovok-cms — see apps/ovok-cms/docs/LOCALES.md for the full recipe.
 */
export const CMS_LOCALES = ['de', 'en', 'fr', 'es'] as const

export type CmsLocale = (typeof CMS_LOCALES)[number]

export const CmsLocaleSchema = z.enum(CMS_LOCALES)

export const DEFAULT_CMS_LOCALE: CmsLocale = 'en'

export const isCmsLocale = (value: null | string | undefined): value is CmsLocale =>
  CmsLocaleSchema.safeParse(value).success
