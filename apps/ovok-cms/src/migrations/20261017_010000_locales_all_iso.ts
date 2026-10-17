import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { sql } from '@payloadcms/db-postgres'

/**
 * Adds every remaining ISO 639-1 language to the locale roster (CMS_LOCALES in
 * @ovok/contracts). The list is frozen here on purpose: an applied migration
 * never changes, and later additions get their own migration
 * (see 20261013_000000_locales_ru_ar and docs/LOCALES.md).
 */
const LOCALES = [
  'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'as', 'av', 'ay', 'az', 'ba', 'be', 'bg', 'bi', 'bm',
  'bn', 'bo', 'br', 'bs', 'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy', 'da', 'dv', 'dz',
  'ee', 'el', 'eo', 'et', 'eu', 'fa', 'ff', 'fi', 'fj', 'fo', 'fy', 'ga', 'gd', 'gl', 'gn', 'gu',
  'gv', 'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz', 'ia', 'id', 'ie', 'ig', 'ii', 'ik',
  'io', 'is', 'it', 'iu', 'ja', 'jv', 'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr',
  'ks', 'ku', 'kv', 'kw', 'ky', 'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv', 'mg', 'mh',
  'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no',
  'nr', 'nv', 'ny', 'oc', 'oj', 'om', 'or', 'os', 'pa', 'pi', 'pl', 'ps', 'pt', 'qu', 'rm', 'rn',
  'ro', 'rw', 'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss',
  'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt',
  'tw', 'ty', 'ug', 'uk', 'ur', 'uz', 've', 'vi', 'vo', 'wa', 'wo', 'xh', 'yi', 'yo', 'za', 'zh',
  'zu',
] as const

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const code of LOCALES) {
    // Codes are the literal two-letter constants above, never input.
    await db.execute(sql.raw(`ALTER TYPE "_locales" ADD VALUE IF NOT EXISTS '${code}';`))
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres cannot remove enum values; unused extra values are harmless, so
  // down is a no-op.
  await db.execute(sql`SELECT 1;`)
}
