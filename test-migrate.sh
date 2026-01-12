#!/bin/sh
set -e

echo "=== Testing Migration Script ==="
echo ""

# Check for sqlite3
echo "Checking for sqlite3..."
if command -v sqlite3 >/dev/null 2>&1; then
  echo "✓ sqlite3 found: $(sqlite3 --version)"
else
  echo "✗ sqlite3 NOT FOUND - installing with apk..."
  apk add --no-cache sqlite
fi

echo ""

# Create temp test directory
TEST_DB="/tmp/test-migration-$$.db"
echo "Test database: $TEST_DB"

# Export environment variables
export DATABASE_URL="file:$TEST_DB"

# Copy migrate.js and update paths for local testing
cat > /tmp/test-migrate.js << 'EOF'
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || "/tmp/test.db";
const MIGRATIONS_DIR = "/workspaces/tada/app/server/db/migrations";

console.log(`Database: ${DB_PATH}`);
console.log(`Migrations: ${MIGRATIONS_DIR}`);

function runSQL(sql) {
  try {
    return execSync(`sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, {
      encoding: "utf8",
    });
  } catch (error) {
    throw new Error(`SQL execution failed: ${error.message}`);
  }
}

async function runMigrations() {
  console.log("\nCreating migrations tracking table...");
  runSQL(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  console.log("Getting already applied migrations...");
  const appliedJSON = runSQL("SELECT json_group_array(hash) FROM __drizzle_migrations");
  const appliedHashes = new Set(JSON.parse(appliedJSON || "[]"));

  console.log("Reading migration files...");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`\nFound ${files.length} migration files\n`);

  for (const file of files) {
    const hash = file;

    if (appliedHashes.has(hash)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    console.log(`  → ${file}`);
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`     Executing ${statements.length} statements...`);

    for (const statement of statements) {
      runSQL(statement);
    }

    runSQL(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('${hash}', ${Date.now()})`);

    console.log(`    ✓ Applied`);
  }

  console.log("\n✅ All migrations applied successfully!");
}

runMigrations().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
EOF

echo ""
echo "=== Running migrations ==="
node /tmp/test-migrate.js

echo ""
echo "=== Verifying database ==="
echo ""
echo "Tables:"
sqlite3 "$TEST_DB" ".tables"

echo ""
echo "Applied migrations:"
sqlite3 "$TEST_DB" "SELECT hash FROM __drizzle_migrations"

echo ""
echo "Users table schema (first 15 lines):"
sqlite3 "$TEST_DB" ".schema users" | head -15

echo ""
echo "✅ TEST PASSED!"
echo ""
echo "Database created at: $TEST_DB"
echo "To inspect: sqlite3 $TEST_DB"
echo ""
echo "Run again to test idempotency:"
echo "  DATABASE_URL=file:$TEST_DB node /tmp/test-migrate.js"
