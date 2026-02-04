import { defineConfig } from 'drizzle-kit'

// Database path strategy:
// - Development: ../data/db.sqlite (outside app/ to avoid watcher issues)
// - Production: Uses DATABASE_URL env var (set in container/CapRover)
// - See docs/DATABASE_LOCATION_MIGRATION.md for details
const databaseUrl = process.env["DATABASE_URL"] || 'file:../data/db.sqlite';

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: databaseUrl,
  },
})
