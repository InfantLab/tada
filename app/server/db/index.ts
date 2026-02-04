import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { ensureDbDirectory } from "./manager";
import { createLogger } from "~/utils/logger";

const logger = createLogger("db:index");

// Database path strategy (see docs/DATABASE_LOCATION_MIGRATION.md):
// - Development: DATABASE_URL set by package.json scripts to ../data/db.sqlite
// - Production: DATABASE_URL set in container/CapRover env vars to /data/db.sqlite
// - Fallback: ../data/db.sqlite (relative to app/, i.e., /workspaces/tada/data/)
const isDev = process.env["NODE_ENV"] === "development";
const databaseUrl = process.env["DATABASE_URL"] || "file:../data/db.sqlite";

logger.info(`Database path: ${databaseUrl} (dev: ${isDev})`);

// Ensure database directory exists before creating client
try {
  ensureDbDirectory(databaseUrl.replace(/^file:/, ""));
} catch (err) {
  logger.error("Failed to ensure database directory", err as Error);
}

// Create libSQL client with robust error handling
const client = createClient({
  url: databaseUrl,
  // Add timeout and retry configuration
  intMode: "number",
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export for type inference
export type Database = typeof db;
