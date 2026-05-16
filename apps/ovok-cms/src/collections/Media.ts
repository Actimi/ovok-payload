import type { CollectionConfig } from 'payload'

import { scanFileForMalware } from '../hooks/scanFileForMalware'

/**
 * Hard server-side cap on uploaded file size. The dashboard pre-checks
 * the same number before issuing the upload so users get an instant
 * rejection on oversize, but the limit is also enforced here so a direct
 * REST call can't sneak through.
 *
 * 50 MB matches the ovok-internal proxy's body parser cap and the
 * dashboard's MAX_SIZE_BYTES in media-uploader.tsx.
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * MIME types the CMS will accept. We deliberately allow only a small
 * set: tenants can host marketing images, documents, and short audio
 * clips. Executable binaries, archives, and shell scripts stay rejected.
 *
 * If a project needs more, the right answer is a project-setting
 * extension that broadens this list per-tenant, not a global broadening
 * here.
 */
const ALLOWED_MIME_TYPES = [
  // images
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  // documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  // audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  // video
  'video/mp4',
  'video/webm',
]

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media',
    mimeTypes: ALLOWED_MIME_TYPES,
    // Payload's own cap. Anything over rejects with 413 before the file
    // is written to disk.
    // @ts-expect-error — Payload's UploadConfig typing missed this in v3.
    limit: MAX_FILE_SIZE,
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    // Malware scan runs after Payload accepts the file but before the
    // doc is committed to the database. A reject here drops the file
    // and surfaces the reason to the client.
    beforeChange: [scanFileForMalware],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      // Populated by the scanFileForMalware hook. Lets the dashboard
      // surface scan status on the media detail page.
      name: 'scanStatus',
      type: 'select',
      options: ['skipped', 'clean', 'suspicious'],
      defaultValue: 'skipped',
      admin: { readOnly: true },
    },
    {
      name: 'scanProvider',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'scannedAt',
      type: 'date',
      admin: { readOnly: true },
    },
  ],
}
