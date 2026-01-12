// Test migration logic using Bun's built-in SQLite
// This tests the exact same logic as migrate.js but with Bun SQLite instead of CLI
import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const TEST_DB = `/tmp/test-migration-${Date.now()}.db`;
const MIGRATIONS_DIR = "/workspaces/tada/app/server/db/migrations";

console.log("=== Testing Migration Logic ===");
console.log(`Database: ${TEST_DB}`);
console.log(`Migrations: ${MIGRATIONS_DIR}\n`);

const db = new Database(TEST_DB);

function runSQL(sql) {
  try {
    db.exec(sql);
  } catch (error) {
    console.error(`❌ SQL execution failed:`, error.message);
    console.error(`SQL snippet: ${sql.substring(0, 100)}...`);
    throw error;
  }
}

function querySQL(sql) {
  try {
    return db.query(sql).all();
  } catch (error) {
    console.error(`❌ SQL query failed:`, error.message);
    throw error;
  }
}

async function runMigrations() {
  console.log("📝 Creating migrations tracking table...");
  runSQL(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  console.log("✓ Tracking table created\n");

  console.log("📋 Checking for applied migrations...");
  const applied = querySQL("SELECT hash FROM __drizzle_migrations");
  const appliedHashes = new Set(applied.map((row) => row.hash));
  console.log(`   Found ${appliedHashes.size} previously applied migrations\n`);

  console.log("📂 Reading migration files...");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`   Found ${files.length} migration files\n`);

  for (const file of files) {
    const hash = file;

    if (appliedHashes.has(hash)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    console.log(`  ⏳ Applying ${file}...`);
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`     ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 50).replace(/\n/g, " ");
      console.log(`     [${i + 1}/${statements.length}] ${preview}...`);
      runSQL(statement);
    }

    const now = Date.now();
    runSQL(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('${hash}', ${now})`);

    console.log(`  ✅ ${file} applied successfully\n`);
  }

  console.log("✅ All migrations complete!\n");
}

console.log("🚀 Running migrations...\n");
await runMigrations();

console.log("🔍 Verifying database...\n");

console.log("Tables created:");
const tables = querySQL("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
tables.forEach((t) => console.log(`  - ${t.name}`));

console.log("\nMigrations applied:");
const migrations = querySQL("SELECT hash, datetime(created_at/1000, 'unixepoch') as applied_at FROM __drizzle_migrations");
migrations.forEach((m) => console.log(`  - ${m.hash} (${m.applied_at})`));

console.log("\nUsers table exists:");
const userSchema = querySQL("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
if (userSchema[0]) {
  console.log("  ✓ Yes");
  const cols = querySQL("PRAGMA table_info(users)");
  console.log(`  Columns: ${cols.map((c) => c.name).join(", ")}`);
} else {
  console.log("  ✗ No - ERROR!");
}

db.close();

console.log(`\n✅ Test complete! Database at: ${TEST_DB}`);
console.log(`\nTo inspect: bun run check-db.mjs (after copying to data/db.sqlite)`);
console.log(`Or: sqlite3 ${TEST_DB}`);
console.log(`\nRun again to test idempotency (should show "already applied"):`);
console.log(`  bun run /workspaces/tada/test-migrate-bun.mjs`);
