import { createLocalizedContentCollection } from './_shared/createLocalizedContentCollection'

/**
 * UI translations: the text apps and the Ovok SDKs show, so wording and new
 * languages ship without an app release. One document per group of strings
 * (`slug` "sign-in"); apps read a string as "<group>.<key>", e.g.
 * "sign-in.title". `value` is localized per row, so a missing translation falls
 * back to the default locale string by string, not document by document.
 *
 * Apps read it before sign-in, so ovok-core serves it without the API key
 * (its PAYLOAD_CMS_KEYLESS_COLLECTIONS). Keep anything that is not public text
 * out of it. A tenant's own group replaces the shared tenant's group of the
 * same slug whole, so copy the shared group before changing one string.
 */
export const Translations = createLocalizedContentCollection({
  slug: 'translations',
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'What the group is for, shown to authors only, e.g. "Sign-in screen".',
      },
      required: true,
    },
    {
      name: 'strings',
      type: 'array',
      admin: {
        description: 'One row per string. Apps read a row as "<group slug>.<key>".',
      },
      fields: [
        {
          name: 'key',
          type: 'text',
          admin: {
            description:
              'The key within the group, e.g. "title"; dots nest, e.g. "errors.required".',
          },
          required: true,
        },
        {
          name: 'value',
          type: 'textarea',
          admin: {
            description:
              'The text in this language. Left empty, readers get the default language text.',
          },
          localized: true,
        },
      ],
    },
  ],
  slugField: {
    description:
      'The group the strings belong to, e.g. "sign-in". Unique per tenant and environment.',
    required: true,
  },
})
