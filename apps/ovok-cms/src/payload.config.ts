import { postgresAdapter } from '@payloadcms/db-postgres'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { schemaEndpoint } from './endpoints/schema'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || process.env.DATABASE_URL || '',
    },
    // Bootstrap mode: let Payload sync schema directly until we generate
    // initial migrations. Flip to false (or unset) once the migration
    // workflow is in place.
    push: true,
  }),
  editor: lexicalEditor(),
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
  collections: [Users, Tenants, Media, Posts],
  plugins: [
    multiTenantPlugin({
      collections: {
        media: {},
        posts: {},
      },
      tenantField: {
        access: {
          // Tenant assignment is driven by the Ovok proxy via the
          // x-ovok-tenant-id header. Reject manual overrides on writes.
          update: () => false,
        },
      },
      tenantsArrayField: {
        includeDefaultField: false,
      },
      userHasAccessToAllTenants: () => false,
    }),
  ],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  sharp,
  cors: '*',
  csrf: [],
  endpoints: [schemaEndpoint],
  // First-deploy bootstrap: gated by env so it doesn't run every time
  // and surprise us with destructive diffs. Unset PAYLOAD_PUSH_ON_INIT
  // after the database is initialised and switch to migrations.
  onInit: async (payload) => {
    if (process.env.PAYLOAD_PUSH_ON_INIT === 'true' && payload.db.push) {
      payload.logger.info('PAYLOAD_PUSH_ON_INIT=true — pushing schema to the database')
      await payload.db.push()
      payload.logger.info('Schema push complete')
    }
  },
})
