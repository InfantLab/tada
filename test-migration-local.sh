#!/bin/bash
set -e

echo "=== Testing Migration Script Locally ==="

# Create test directory
TEST_DIR="/tmp/test-migration-$$"
mkdir -p "$TEST_DIR"
echo "Test directory: $TEST_DIR"

# Set up test environment
export DATABASE_URL="file:$TEST_DIR/test.db"
export MIGRATIONS_DIR="/workspaces/tada/app/server/db/migrations"

# Create a modified migrate.js that uses local paths
cat > "$TEST_DIR/migrate-test.js" << 'EOF'
// Simple migration runner for production using sqlite3 CLI
// Applies SQL migrations from server/db/migrations directory
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || "/app/data/db.sqlite";
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || "/app/server/db/migrations";

console.log(`Database: ${DB_PATH}`);
console.log(`Migrations: ${MIGRATIONS_DIR}`);

function runSQL(sql) {
  try {
    const result = execSync(`sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\\"')}"`, {
      encoding: "utf8",
    });
    return result;
  } catch (error) {
    console.error(`SQL execution failed: ${error.message}`);
    console.error(`SQL was: ${sql.substring(0, 200)}...`);
    throw error;
  }
}

async function runMigrations() {
  // Create migrations tracking table if it doesn't exist
  runSQL(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Get already applied migrations
  const appliedJSON = runSQL("SELECT json_group_array(hash) FROM __drizzle_migrations");
  const appliedHashes = new Set(JSON.parse(appliedJSON || "[]"));

  // Read migration files
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files`);

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

    console.log(`    Found ${statements.length} statements`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`    Executing statement ${i + 1}/${statements.length}...`);
      runSQL(statement);
    }

    // Record migration
    runSQL(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('${hash}', ${Date.now()})`);

    console.log(`    ✓ Applied`);
  }

  console.log("All migrations applied successfully!");
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
EOF

echo ""
echo "Running migrations..."
cd /workspaces/tada/app
node "$TEST_DIR/migrate-test.js"

echo ""
echo "=== Verifying tables were created ==="
sqlite3 "$TEST_DIR/test.db" ".tables"

echo ""
echo "=== Checking migrations table ==="
sqlite3 "$TEST_DIR/test.db" "SELECT * FROM __drizzle_migrations"

echo ""
echo "=== Checking users table structure ==="
sqlite3 "$TEST_DIR/test.db" ".schema users"

echo ""
echo "=== Test complete! ==="
echo "Database created at: $TEST_DIR/test.db"
echo ""
echo "To inspect manually: sqlite3 $TEST_DIR/test.db"
