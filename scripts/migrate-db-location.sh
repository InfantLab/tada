#!/bin/bash
# Database Location Migration Script
# Moves database from app/data/ to /workspaces/tada/data/ for dev
# to avoid file watcher conflicts

set -e

echo "🔍 Checking database locations..."

OLD_DB="./app/data/db.sqlite"
NEW_DB="./data/db.sqlite"

# Check if old location exists and has data
if [ -f "$OLD_DB" ]; then
    OLD_SIZE=$(stat -f%z "$OLD_DB" 2>/dev/null || stat -c%s "$OLD_DB" 2>/dev/null)
    echo "   Found database at $OLD_DB (${OLD_SIZE} bytes)"
    
    # Check if new location exists
    if [ -f "$NEW_DB" ]; then
        NEW_SIZE=$(stat -f%z "$NEW_DB" 2>/dev/null || stat -c%s "$NEW_DB" 2>/dev/null)
        echo "   Found database at $NEW_DB (${NEW_SIZE} bytes)"
        
        # Only migrate if old is larger (has more data)
        if [ "$OLD_SIZE" -gt "$NEW_SIZE" ]; then
            echo "⚠️  Old database is larger - migration needed"
            echo "   Backing up new location first..."
            cp "$NEW_DB" "${NEW_DB}.backup-$(date +%Y%m%d-%H%M%S)"
            
            echo "   Copying old database to new location..."
            cp "$OLD_DB" "$NEW_DB"
            
            # Copy journal files if they exist
            if [ -f "${OLD_DB}-wal" ]; then
                cp "${OLD_DB}-wal" "${NEW_DB}-wal"
            fi
            if [ -f "${OLD_DB}-shm" ]; then
                cp "${OLD_DB}-shm" "${NEW_DB}-shm"
            fi
            
            echo "✅ Migration complete!"
            echo "   Old database preserved at: $OLD_DB"
            echo "   Active database now at: $NEW_DB"
        else
            echo "ℹ️  New location already has equal or more data - no migration needed"
        fi
    else
        echo "   New location doesn't exist - creating directory and copying..."
        mkdir -p "./data"
        cp "$OLD_DB" "$NEW_DB"
        
        # Copy journal files if they exist
        if [ -f "${OLD_DB}-wal" ]; then
            cp "${OLD_DB}-wal" "${NEW_DB}-wal"
        fi
        if [ -f "${OLD_DB}-shm" ]; then
            cp "${OLD_DB}-shm" "${NEW_DB}-shm"
        fi
        
        echo "✅ Database copied to new location!"
        echo "   Old database preserved at: $OLD_DB"
        echo "   Active database now at: $NEW_DB"
    fi
else
    echo "ℹ️  No database at old location - nothing to migrate"
fi

echo ""
echo "📍 Database location info:"
echo "   Development: /workspaces/tada/data/db.sqlite (outside watched directory)"
echo "   Production:  Uses DATABASE_URL env var (unchanged)"
echo ""
echo "🔒 Old database files in app/data/ are preserved for safety"
echo "   You can delete them after confirming the new location works"
