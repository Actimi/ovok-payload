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
// Every ISO 639-1 language. The first six keep their original order (shipped before the full
// roster); the rest are alphabetical. Bare codes only: `de`, never `de-DE`.
export const CMS_LOCALES = [
  'de', 'en', 'fr', 'es', 'ru', 'ar', 'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'as', 'av', 'ay',
  'az', 'ba', 'be', 'bg', 'bi', 'bm', 'bn', 'bo', 'br', 'bs', 'ca', 'ce', 'ch', 'co', 'cr', 'cs',
  'cu', 'cv', 'cy', 'da', 'dv', 'dz', 'ee', 'el', 'eo', 'et', 'eu', 'fa', 'ff', 'fi', 'fj', 'fo',
  'fy', 'ga', 'gd', 'gl', 'gn', 'gu', 'gv', 'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz',
  'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu', 'ja', 'jv', 'ka', 'kg', 'ki', 'kj',
  'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky', 'la', 'lb', 'lg', 'li', 'ln',
  'lo', 'lt', 'lu', 'lv', 'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'na', 'nb',
  'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny', 'oc', 'oj', 'om', 'or', 'os', 'pa', 'pi',
  'pl', 'ps', 'pt', 'qu', 'rm', 'rn', 'ro', 'rw', 'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl',
  'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk',
  'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty', 'ug', 'uk', 'ur', 'uz', 've', 'vi', 'vo', 'wa',
  'wo', 'xh', 'yi', 'yo', 'za', 'zh', 'zu',
] as const

export type CmsLocale = (typeof CMS_LOCALES)[number]

export const CmsLocaleSchema = z.enum(CMS_LOCALES)

export const DEFAULT_CMS_LOCALE: CmsLocale = 'en'

export const isCmsLocale = (value: null | string | undefined): value is CmsLocale =>
  CmsLocaleSchema.safeParse(value).success
