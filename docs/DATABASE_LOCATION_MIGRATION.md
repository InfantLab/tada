# Database Location Change - Migration Guide

## Summary

**Date:** 2025-01-27  
**Impact:** Development only (production unchanged)  
**Risk:** Low (old data preserved, migration script provided)

## What Changed

### Before

```
/workspaces/tada/app/data/db.sqlite  ← Development database (INSIDE watched directory)
```

### After

```
/workspaces/tada/data/db.sqlite      ← Development database (OUTSIDE watched directory)
```

## Why The Change

**Problem:** File watcher (chokidar) monitors `app/` directory for hot reload. When SQLite creates/deletes journal files during transactions, the watcher tries to watch them, causing EINVAL errors and server crashes.

**Solution:** Move database outside the watched directory in development. The watcher never sees journal files, no more conflicts.

## Production Safety

✅ **Production is unaffected:**

- Production uses `DATABASE_URL` environment variable (set in CapRover)
- CapRover persistent volume: `/var/lib/caprover/appsdata/tadata` → `/data`
- Container database path: `/data/db.sqlite` (unchanged)
- See [DEPLOY_CAPROVER.md](./DEPLOY_CAPROVER.md) for production config

## Development Migration

### Automatic Migration (Recommended)

Run the migration script from the repository root:

```bash
cd /workspaces/tada
./scripts/migrate-db-location.sh
```

**What it does:**

1. Checks both locations for existing databases
2. Compares file sizes to find which has more data
3. Backs up the target location before overwriting
4. Copies database + journal files to new location
5. Preserves old location for safety

### Manual Migration (If Needed)

If you prefer to do it manually:

```bash
# From repository root
mkdir -p data
cp app/data/db.sqlite data/db.sqlite

# Copy journal files if they exist
cp app/data/db.sqlite-wal data/db.sqlite-wal 2>/dev/null || true
cp app/data/db.sqlite-shm data/db.sqlite-shm 2>/dev/null || true
```

### Verification

After migration, verify the new location works:

```bash
# Check file exists and has data
ls -lh data/db.sqlite

# Start dev server
cd app
bun run dev

# Create an entry - watch for EINVAL errors (should be gone!)
```

## Rollback (If Needed)

If you need to rollback to the old location:

1. Stop the dev server
2. Set environment variable: `export DATABASE_URL="file:./data/db.sqlite"`
3. Copy data back: `cp data/db.sqlite app/data/db.sqlite`
4. Restart dev server

## File Locations Reference

| Environment     | Location                              | Path Type           | Watcher Conflict?           |
| --------------- | ------------------------------------- | ------------------- | --------------------------- |
| **Development** | `/workspaces/tada/data/db.sqlite`     | Absolute            | ❌ No (outside `app/`)      |
| **Production**  | `/data/db.sqlite` (in container)      | From `DATABASE_URL` | N/A (no watcher)            |
| **Old Dev**     | `/workspaces/tada/app/data/db.sqlite` | Relative            | ✅ Yes (was causing issues) |

## .gitignore Coverage

Both locations are ignored:

```gitignore
# Root .gitignore
data/
*.sqlite
*.sqlite-wal
*.sqlite-shm
```

## Code Changes (Updated Feb 2026)

### Unified Database Path Strategy

**All tools use `DATABASE_URL` env var with consistent fallback:**

| Context | How DATABASE_URL is set | Resolves to |
|---------|------------------------|-------------|
| `bun run dev` | package.json: `DATABASE_URL=file:../data/db.sqlite` | `/workspaces/tada/data/db.sqlite` |
| `bun run db:migrate` | package.json: `DATABASE_URL=file:../data/db.sqlite` | `/workspaces/tada/data/db.sqlite` |
| `bun run db:studio` | package.json: `DATABASE_URL=file:../data/db.sqlite` | `/workspaces/tada/data/db.sqlite` |
| Production (CapRover) | Container env var: `DATABASE_URL=file:/data/db.sqlite` | `/data/db.sqlite` |
| Docker Compose | docker-compose.yml sets it | `/app/data/db.sqlite` |

### `package.json` scripts

```json
{
  "dev": "DATABASE_URL=file:../data/db.sqlite nuxt dev",
  "db:migrate": "DATABASE_URL=file:../data/db.sqlite drizzle-kit migrate",
  "db:studio": "DATABASE_URL=file:../data/db.sqlite drizzle-kit studio"
}
```

### `server/db/index.ts`

```typescript
// Fallback only - package.json scripts should always set DATABASE_URL
const databaseUrl = process.env["DATABASE_URL"] || "file:../data/db.sqlite";
```

### `drizzle.config.ts`

```typescript
const databaseUrl = process.env["DATABASE_URL"] || 'file:../data/db.sqlite';
```

**Key points:**

- `DATABASE_URL` is set by package.json scripts (dev) or container env vars (prod)
- **Do NOT set DATABASE_URL in `.env`** - it causes conflicts with package.json
- All fallbacks use `../data/db.sqlite` (relative to app/, outside watched directory)
- Production always uses explicit env var from container/CapRover

## Cleanup (Optional)

After confirming the new location works for a few days, you can safely delete the old location:

```bash
# Remove old database (from repository root)
rm -rf app/data/db.sqlite*

# Keep the directory for logs/test files
# app/data/logs/ is still used
```

## Troubleshooting

### "Database not found" error

Check your current directory and the database path:

```bash
pwd  # Should be /workspaces/tada/app
ls -la ../data/db.sqlite  # Should exist
```

### Still seeing EINVAL errors

1. Verify database is at `/workspaces/tada/data/db.sqlite` (not `app/data/`)
2. Restart the dev server completely
3. Check `ps aux | grep node` for zombie processes

### Production deployment fails

1. Check DATABASE_URL is set in CapRover: `file:/data/db.sqlite`
2. Verify persistent volume is mounted: `/var/lib/caprover/appsdata/tadata` → `/data`
3. Database files should be in the persistent volume on the host machine

## Related Files

- `scripts/migrate-db-location.sh` - Migration script
- `server/db/index.ts` - Database initialization with new path logic
- `docs/DEPLOY_CAPROVER.md` - Production deployment configuration
- `.gitignore` - Ensures database files are never committed

## Questions?

- **Q: Will this affect my existing data?**  
  A: No, the migration script copies your data safely. Old location is preserved.

- **Q: What about production?**  
  A: Production uses `DATABASE_URL` env var, completely unaffected by this change.

- **Q: Can I still use a custom DATABASE_URL?**  
  A: Yes, `DATABASE_URL` always takes precedence over defaults.

- **Q: What if I'm on Windows?**  
  A: The path logic works cross-platform. `../data/` resolves correctly on Windows too.
