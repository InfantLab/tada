import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import * as schema from "./schema";

// Get database path from runtime config or environment
// Use absolute path to avoid issues with working directory in different environments
const databaseUrl =
  process.env["DATABASE_URL"] ||
  `file:${join(process.cwd(), "data", "db.sqlite")}`;

// Ensure data directory exists before trying to open database
const dataDir = join(process.cwd(), "data");
if (!existsSync(dataDir)) {
  try {
    mkdirSync(dataDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create data directory:", error);
  }
}

// Create libSQL client (works with Bun, no native deps needed)
const client = createClient({
  url: databaseUrl,
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export for type inference
export type Database = typeof db;
