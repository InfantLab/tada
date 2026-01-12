// Test migration runner locally
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const TEST_DB = `/tmp/test-migration-${Date.now()}.db`;
const MIGRATIONS_DIR = "/workspaces/tada/app/server/db/migrations";

console.log("=== Testing Migration Script ===");
console.log(`Database: ${TEST_DB}`);
console.log(`Migrations: ${MIGRATIONS_DIR}`);

function runSQL(sql) {
  try {
    // Use heredoc to avoid escaping issues
    const result = execSync(`sqlite3 "${TEST_DB}"`, {
      input: sql,
      encoding: "utf8",
    });
    return result;
  } catch (error) {
    console.error(`❌ SQL execution failed:`, error.message);
    console.error(`SQL snippet: ${sql.substring(0, 100)}...`);
    throw error;
  }
}

async function runMigrations() {
  console.log("\n📝 Creating migrations tracking table...");
  runSQL(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  console.log("✓ Tracking table created");

  console.log("\n📋 Checking for applied migrations...");
  const appliedJSON = runSQL(
    "SELECT json_group_array(hash) FROM __drizzle_migrations;"
  );
  const appliedHashes = new Set(JSON.parse(appliedJSON.trim() || "[]"));
  console.log(`   Found ${appliedHashes.size} previously applied migrations`);

  console.log("\n📂 Reading migration files...");
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
    runSQL(
      `INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('${hash}', ${now});`
    );

    console.log(`  ✅ ${file} applied successfully\n`);
  }

  console.log("✅ All migrations complete!\n");
}

console.log("\n🚀 Running migrations...\n");
await runMigrations();

console.log("🔍 Verifying database...\n");
console.log("Tables created:");
const tables = runSQL(".tables");
console.log(tables);

console.log("\nMigrations applied:");
const migrations = runSQL(
  "SELECT hash, datetime(created_at/1000, 'unixepoch') as applied_at FROM __drizzle_migrations;"
);
console.log(migrations);

console.log("\nUsers table schema:");
const schema = runSQL(".schema users");
console.log(schema);

console.log(`\n✅ Test complete! Database at: ${TEST_DB}`);
console.log(`\nTo inspect: sqlite3 ${TEST_DB}`);
console.log(
  `\nRun this test again to verify idempotency (should show "already applied")`
);
