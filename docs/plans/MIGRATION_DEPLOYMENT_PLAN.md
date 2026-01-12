# Migration Script - Production Deployment Plan

## Current Status: ✅ Dev-Tested, ⚠️ Awaiting Docker Verification

### What We've Accomplished

1. **Created hybrid migration script** (`app/migrate.js`):

   - Detects runtime automatically (Bun vs Node)
   - Works in both dev and production environments
   - Fully tested with Bun's built-in SQLite
   - Implements Node + sqlite3 CLI path for production

2. **Verified in development**:

   - ✅ All migrations apply successfully
   - ✅ Idempotency works (skips already-applied migrations)
   - ✅ Database created with correct schema
   - ✅ All 8 tables present (users, entries, habits, etc.)

3. **Documented everything**:
   - Full test log in `docs/MIGRATION_TESTING.md`
   - This deployment plan

### Before Pushing to CapRover

**CRITICAL**: Test the Node + sqlite3 CLI path locally first!

#### Option 1: Test with Docker Desktop (Recommended)

```bash
# Build image
docker build -t tada:migration-test .

# Test that sqlite3 is available
docker run --rm tada:migration-test sqlite3 --version

# Test migration script
docker run --rm tada:migration-test node /app/migrate.js

# Test full startup (migrations + server)
docker run --rm -p 3000:3000 tada:migration-test

# Check if migrations ran
docker run --rm tada:migration-test sqlite3 /app/data/db.sqlite ".tables"
```

#### Option 2: Push to a Test CapRover App

```bash
# Create a test app in CapRover (e.g., "tada-test")
# Deploy this version there first
git push origin main

# Monitor logs in CapRover
# Look for:
# - "Using Node with sqlite3 CLI"
# - "→ 0000_careful_sauron.sql"
# - "✓ Applied"
# - "✅ All migrations applied successfully!"
```

#### Option 3: Inspect Production Logs After Deploy

```bash
# Push and watch logs carefully
git push origin main

# In CapRover, check app logs immediately
# If migrations fail, you'll see errors right away
# Can roll back if needed
```

### Expected Behavior in Production

When the container starts, you should see:

```
Running database migrations...
Database: /app/data/db.sqlite
Migrations: /app/server/db/migrations
Using Node with sqlite3 CLI
Database: /app/data/db.sqlite
Found 2 migration files

  → 0000_careful_sauron.sql
    ✓ Applied
  → 0001_cheerful_steve_rogers.sql
    ✓ Applied

✅ All migrations applied successfully!
Migrations complete. Starting server...
```

On subsequent restarts:

```
Running database migrations...
Database: /app/data/db.sqlite
Migrations: /app/server/db/migrations
Using Node with sqlite3 CLI
Database: /app/data/db.sqlite
Found 2 migration files

  ✓ 0000_careful_sauron.sql (already applied)
  ✓ 0001_cheerful_steve_rogers.sql (already applied)

✅ All migrations applied successfully!
Migrations complete. Starting server...
```

### What Could Go Wrong

❌ **sqlite3 not available** (unlikely - we added it to Dockerfile)

```
sh: sqlite3: not found
```

**Fix**: Verify `apk add --no-cache sqlite` in Dockerfile line 33

❌ **SQL syntax error in Node path** (different escaping than Bun)

```
SQL execution failed: ...
```

**Fix**: Adjust escaping in the Node runSQL function

❌ **JSON parsing error** (different output format from sqlite3 CLI)

```
Unexpected token...
```

**Fix**: May need to adjust JSON query approach

### Rollback Plan

If migrations fail in production:

1. **Immediate**: Click "Stop App" in CapRover
2. **Inspect**: Check logs for specific error
3. **Fix locally**: Adjust migrate.js based on error
4. **Test**: Re-test with Docker locally
5. **Re-deploy**: Push fixed version

### After Successful Deployment

✅ **Test user registration**:

- Go to tada.onemonkey.org
- Try to register a new user
- Should work now (no "SQLITE_ERROR: no such table: users")

✅ **Verify database**:

- SSH into CapRover host
- Check database file: `sudo ls -lh /var/lib/caprover/appsdata/tadata/`
- Should see `db.sqlite` with reasonable size (>60KB)

✅ **Verify migrations table**:

```bash
# In CapRover terminal or SSH
sqlite3 /var/lib/caprover/appsdata/tadata/db.sqlite "SELECT * FROM __drizzle_migrations"
```

Should show 2 rows with migration hashes

### Next Issue to Fix

⚠️ **Bun.password.hash() incompatibility**

After migrations work, user registration will still fail because `app/server/api/auth/register.post.ts` uses `Bun.password.hash()` which doesn't work in Node runtime.

**Fix needed**: Replace with Node-compatible password hashing:

- Option 1: `bcrypt` package
- Option 2: `argon2` package
- Option 3: Node's built-in `crypto.scrypt()`

But let's tackle that AFTER confirming migrations work!

### Summary

We've built a solid, well-tested migration system. The Bun path is verified working. The Node path is implemented using standard stdin/stdout with sqlite3 CLI - a simple, battle-tested approach.

**Confidence level**: 85% it will work in production as-is. The 15% uncertainty is just the sqlite3 CLI JSON output format and escaping differences between Bun and Node.

**Recommendation**: Test with local Docker if possible, but the risk of deploying directly to CapRover is low since:

1. Migrations are idempotent (safe to retry)
2. We can monitor logs in real-time
3. Easy to rollback if needed
4. No existing data to corrupt

Your call on whether to test locally first or deploy directly!
