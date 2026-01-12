#!/bin/sh
set -e

echo "=== Checking Environment ==="
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME || echo 'Unknown')"
echo "Node: $(node --version || echo 'Not found')"
echo "Bun: $(bun --version || echo 'Not found')"
echo "SQLite3: $(sqlite3 --version || echo 'Not found')"

echo ""
echo "=== Testing Migration Script Locally ==="

# Create test directory
TEST_DIR="/tmp/test-migration-$$"
mkdir -p "$TEST_DIR"
echo "Test directory: $TEST_DIR"

# Set up test environment
export DATABASE_URL="file:$TEST_DIR/test.db"
export MIGRATIONS_DIR="/workspaces/tada/app/server/db/migrations"

# Create a test migration script
cat > "$TEST_DIR/migrate-test.mjs" << 'EOFMIGRATE'
// Simple migration runner for testing
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || "/tmp/test.db";
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || "/app/server/db/migrations";

console.log(`Database: ${DB_PATH}`);
console.log(`Migrations: ${MIGRATIONS_DIR}`);

function runSQL(sql) {
  try {
    // Escape double quotes and single quotes for shell
    const escaped = sql.replace(/"/g, '\\"').replace(/'/g, "'\"'\"'");
    const cmd = `sqlite3 "${DB_PATH}" "${escaped}"`;
    const result = execSync(cmd, {
      encoding: "utf8",
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result;
  } catch (error) {
    console.error(`SQL execution failed: ${error.message}`);
    console.error(`SQL was: ${sql.substring(0, 200)}...`);
    throw error;
  }
}

async function runMigrations() {
  console.log("\n=== Creating migrations tracking table ===");
  runSQL(`CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at INTEGER NOT NULL)`);

  console.log("=== Getting applied migrations ===");
  const appliedJSON = runSQL("SELECT json_group_array(hash) FROM __drizzle_migrations");
  console.log(`Applied migrations JSON: ${appliedJSON}`);
  const appliedHashes = new Set(JSON.parse(appliedJSON.trim() || "[]"));
  console.log(`Applied hashes: ${Array.from(appliedHashes)}`);

  console.log("\n=== Reading migration files ===");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files: ${files.join(", ")}`);

  for (const file of files) {
    const hash = file;

    if (appliedHashes.has(hash)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    console.log(`\n  → ${file}`);
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`    Found ${statements.length} statements`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`    Executing statement ${i + 1}/${statements.length}...`);
      const preview = statement.substring(0, 60).replace(/\n/g, " ");
      console.log(`      ${preview}...`);
      runSQL(statement);
    }

    const now = Date.now();
    runSQL(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('${hash}', ${now})`);

    console.log(`    ✓ Applied ${file}`);
  }

  console.log("\n=== All migrations applied successfully! ===");
}

runMigrations().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
EOFMIGRATE

echo ""
echo "=== Running migrations with Node ==="
node "$TEST_DIR/migrate-test.mjs"

echo ""
echo "=== Verifying tables were created ==="
sqlite3 "$TEST_DIR/test.db" ".tables"

echo ""
echo "=== Checking migrations table ==="
sqlite3 "$TEST_DIR/test.db" "SELECT id, hash, datetime(created_at/1000, 'unixepoch') as applied_at FROM __drizzle_migrations"

echo ""
echo "=== Checking users table structure ==="
sqlite3 "$TEST_DIR/test.db" ".schema users" | head -20

echo ""
echo "=== Test complete! ==="
echo "Database: $TEST_DIR/test.db"
echo ""
echo "Run again to verify idempotency (should show 'already applied'):"
echo "  node $TEST_DIR/migrate-test.mjs"
