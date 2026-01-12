// Simple migration runner for production
// Applies SQL migrations from server/db/migrations directory
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { createClient } from "@libsql/client";

const DB_PATH = process.env.DATABASE_URL || "file:/app/data/db.sqlite";
const MIGRATIONS_DIR = "/app/server/db/migrations";

async function runMigrations() {
  const client = createClient({ url: DB_PATH });

  // Create migrations tracking table if it doesn't exist
  await client.execute(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Get already applied migrations
  const applied = await client.execute("SELECT hash FROM __drizzle_migrations");
  const appliedHashes = new Set(applied.rows.map((r) => r.hash));

  // Read migration files
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const hash = file;

    if (appliedHashes.has(hash)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    console.log(`  → ${file}`);
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

    // Split by statement breakpoint and execute each statement
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await client.execute(statement);
    }

    // Record migration
    await client.execute({
      sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
      args: [hash, Date.now()],
    });

    console.log(`    ✓ Applied`);
  }

  client.close();
  console.log("All migrations applied successfully!");
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
