import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import * as schema from "./schema";

// Get database path from runtime config or environment
// Production (Docker at /app): Falls back to /app/data/db.sqlite
// Dev (devcontainer at /workspaces/tada): Falls back to /workspaces/tada/app/data/db.sqlite
// But in production, CapRover volume is at /data, so we need special handling
const isProduction = process.env.NODE_ENV === "production";
const isDockerProduction = process.cwd() === "/app";
const defaultPath = isDockerProduction
  ? "/data/db.sqlite" // CapRover persistent volume
  : join(process.cwd(), "data", "db.sqlite"); // Dev workspace

const databaseUrl = process.env["DATABASE_URL"] || `file:${defaultPath}`;

// Ensure data directory exists before trying to open database
const dataDir = isDockerProduction ? "/data" : join(process.cwd(), "data");
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
