import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { ensureDbDirectory } from "./manager";
import { createLogger } from "~/utils/logger";

const logger = createLogger("db:index");

// Get database path from runtime config or environment
// In development, store OUTSIDE the app directory to avoid file watcher issues
const isDev = process.env["NODE_ENV"] === "development";
const databaseUrl =
  process.env["DATABASE_URL"] ||
  (isDev
    ? "file:../data/db.sqlite" // Outside app/ directory - not watched
    : "file:./data/db.sqlite"); // Inside app/ for production

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
