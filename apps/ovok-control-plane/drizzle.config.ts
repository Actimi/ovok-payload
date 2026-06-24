import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url:
      process.env.CONTROL_PLANE_DATABASE_URL ??
      'postgres://control:control@localhost:5433/ovok_control_plane',
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/db/schema.ts',
})
