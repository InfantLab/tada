#!/bin/sh
set -e

echo "Running database migrations..."

# Ensure data directory exists
mkdir -p /data

# Run migrations using Node script
node /app/migrate.js

echo "Migrations complete. Starting server..."
exec node .output/server/index.mjs
