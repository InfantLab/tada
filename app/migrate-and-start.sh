#!/bin/sh
set -e

echo "Running database migrations..."

# Path to migrations
MIGRATIONS_DIR="/app/server/db/migrations"
DB_PATH="/app/data/db.sqlite"

# Ensure data directory exists
mkdir -p /app/data

# Run migrations using drizzle-kit
cd /app
npx drizzle-kit migrate

echo "Migrations complete. Starting server..."
exec node .output/server/index.mjs
