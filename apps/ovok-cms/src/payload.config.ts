import type { SharpDependency } from 'payload'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { ContentItems } from './collections/ContentItems'
import { ContentTypes } from './collections/ContentTypes'
import { LegalPages } from './collections/LegalPages'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { ReleaseNotes } from './collections/ReleaseNotes'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { healthEndpoint } from './endpoints/health'
import { provisionTenantEndpoint } from './endpoints/provisionTenant'
import { schemaEndpoint } from './endpoints/schema'
import { migrations } from './migrations/index'
import { ovokEnvironmentPlugin } from './plugins/ovokEnvironment'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    // Payload's bundled admin UI is permanently off. The Ovok Dashboard
    // (../ovok-dashboard) renders Payload-style CRUD forms client-side
    // using the schema returned by /_ovok/schema.
    disable: true,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Tenants, Media, Posts, ContentTypes, ContentItems, ReleaseNotes, LegalPages],
  cors: '*',
  csrf: [],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || process.env.DATABASE_URL || '',
    },
    prodMigrations: migrations,
    // Dev-mode schema push, on by default. Tests set PAYLOAD_DB_PUSH=false so
    // they run against the migration-built schema — the one production gets —
    // instead of letting push paper over migration gaps.
    push: process.env.PAYLOAD_DB_PUSH !== 'false',
  }),
  editor: lexicalEditor(),
  endpoints: [healthEndpoint, provisionTenantEndpoint, schemaEndpoint],
  // Multi-language content (carehub-product-roadmap#895). Fields marked
  // `localized: true` store one value per locale; reads pick a locale via
  // `?locale=` and fall back to the default when a translation is missing.
  localization: {
    defaultLocale: 'de',
    fallback: true,
    locales: ['de', 'en', 'fr', 'es'],
  },
  plugins: [
    ovokEnvironmentPlugin(),
    multiTenantPlugin({
      collections: {
        'content-items': {},
        'content-types': {},
        'legal-pages': {},
        media: {},
        posts: {},
        'release-notes': {},
      },
      tenantField: {
        access: {
          // Tenant assignment is driven by the Ovok proxy via the
          // x-ovok-tenant-id header. Reject manual overrides on writes.
          update: () => false,
        },
        // Assign the tenant from the proxy-authenticated user on create.
        // The plugin's built-in default only auto-assigns from req.user when
        // autosave is enabled; these collections have none, so without this
        // every create fails validation with "Assigned Tenant is required".
        defaultValue: ({ req }) => {
          const user = req?.user as
            | { tenants?: Array<{ tenant?: number | string }> }
            | null
            | undefined
          return user?.tenants?.[0]?.tenant ?? null
        },
      },
      tenantsArrayField: {
        includeDefaultField: false,
      },
      userHasAccessToAllTenants: () => false,
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
  sharp: sharp as unknown as SharpDependency,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
