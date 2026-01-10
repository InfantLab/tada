import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

// Get database path from runtime config or environment
const databaseUrl = process.env.DATABASE_URL || 'file:./data/db.sqlite'

// Create libSQL client (works with Bun, no native deps needed)
const client = createClient({
  url: databaseUrl,
})

// Create Drizzle instance with schema
export const db = drizzle(client, { schema })

// Export for type inference
export type Database = typeof db
