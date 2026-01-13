// Migration runner that works with both Bun (dev) and Node+sqlite3 CLI (production)
// Applies SQL migrations from server/db/migrations directory
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Determine paths based on environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default database path
// Check if we're in the Docker production environment (file is at /app/migrate.js)
// or dev environment (file is at /workspaces/tada/app/migrate.js or similar)
const isDockerProduction = __dirname === "/app";
const defaultDbPath = isDockerProduction
  ? "/data/db.sqlite"
  : join(__dirname, "data", "db.sqlite");

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || defaultDbPath;

// Ensure data directory exists
const { mkdirSync } = await import("fs");
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Try multiple possible migration directory locations
const possibleMigrationsDirs = [
  "/app/server/db/migrations", // Production (Docker)
  join(__dirname, "server", "db", "migrations"), // Dev (from app/ directory)
  join(process.cwd(), "server", "db", "migrations"), // Alternative
];

const MIGRATIONS_DIR =
  possibleMigrationsDirs.find((dir) => existsSync(dir)) ||
  possibleMigrationsDirs[0];

console.log(`Database: ${DB_PATH}`);
console.log(`Migrations: ${MIGRATIONS_DIR}`);

// Detect runtime and set up SQL execution
let runSQL, querySQL;

if (typeof Bun !== "undefined") {
  // Bun runtime - use built-in SQLite
  console.log("Using Bun SQLite");
  const { Database } = await import("bun:sqlite");
  const db = new Database(DB_PATH);

  runSQL = (sql) => {
    try {
      db.exec(sql);
    } catch (error) {
      throw new Error(`SQL execution failed: ${error.message}`);
    }
  };

  querySQL = (sql) => {
    try {
      return db.query(sql).all();
    } catch (error) {
      throw new Error(`SQL query failed: ${error.message}`);
    }
  };
} else {
  // Node runtime - use sqlite3 CLI
  console.log("Using Node with sqlite3 CLI");
  const { execSync } = await import("child_process");

  runSQL = (sql) => {
    try {
      execSync(`sqlite3 "${DB_PATH}"`, {
        input: sql,
        encoding: "utf8",
      });
    } catch (error) {
      throw new Error(`SQL execution failed: ${error.message}`);
    }
  };

  querySQL = (sql) => {
    try {
      const result = execSync(`sqlite3 "${DB_PATH}"`, {
        input: sql,
        encoding: "utf8",
      });
      return JSON.parse(result.trim() || "[]");
    } catch (error) {
      throw new Error(`SQL query failed: ${error.message}`);
    }
  };
}

async function runMigrations() {
  console.log(`Database: ${DB_PATH}`);

  // Create migrations tracking table if it doesn't exist
  runSQL(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // Get already applied migrations
  let appliedHashes;
  if (typeof Bun !== "undefined") {
    const applied = querySQL("SELECT hash FROM __drizzle_migrations");
    appliedHashes = new Set(applied.map((row) => row.hash));
  } else {
    const appliedJSON = querySQL(
      "SELECT json_group_array(hash) FROM __drizzle_migrations"
    );
    appliedHashes = new Set(appliedJSON);
  }

  // Read migration files
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files\n`);

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
      runSQL(statement);
    }

    // Record migration
    const now = Date.now();
    runSQL(
      `INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('${hash}', ${now});`
    );

    console.log(`    ✓ Applied`);
  }

  console.log("\n✅ All migrations applied successfully!");
}

runMigrations().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
