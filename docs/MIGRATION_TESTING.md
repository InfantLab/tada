# Migration Testing Log

## Testing Date: 2026-01-12

## Migration Script: `app/migrate.js`

### Features

- **Runtime Detection**: Automatically detects Bun vs Node runtime
  - Bun: Uses built-in `bun:sqlite` (dev/testing)
  - Node: Uses `sqlite3` CLI binary (production)
- **Path Detection**: Determines database location based on environment
  - Dev: `./data/db.sqlite` (relative to script location)
  - Production: `/app/data/db.sqlite` (Docker container)
- **Idempotent**: Tracks applied migrations, skips already-applied ones
- **Auto-creates directories**: Creates data directory if it doesn't exist

### Test Results

#### Test 1: Basic Migration (Bun)

```bash
cd /workspaces/tada/app && unset DATABASE_URL && bun migrate.js
```

✅ **PASSED**

- Database created at: `/workspaces/tada/app/data/db.sqlite`
- All 2 migrations applied successfully
- Tables created: users, entries, habits, sessions, timer_presets, category_settings, attachments

#### Test 2: Idempotency (Bun)

```bash
cd /workspaces/tada/app && unset DATABASE_URL && bun migrate.js
# Run again
cd /workspaces/tada/app && unset DATABASE_URL && bun migrate.js
```

✅ **PASSED**

- First run: Applied 2 migrations
- Second run: Showed "already applied" for both migrations
- No errors, no duplicate data

#### Test 3: Custom Database Path

```bash
DATABASE_URL=file:/tmp/test-custom.db bun migrate.js
```

✅ **PASSED**

- Database created at custom location
- Migrations applied successfully

### Database Verification

```bash
cd app && bun check-db.mjs
```

✅ **Tables exist**:

- `__drizzle_migrations` - Migration tracking
- `users` - User accounts (id, username, password_hash, timezone, created_at, updated_at)
- `entries` - Entries with ontology fields (type, category, subcategory, emoji)
- `habits` - Habit definitions
- `sessions` - Auth sessions
- `timer_presets` - Saved timers
- `category_settings` - User customizations
- `attachments` - Entry files

### Production Readiness

#### What Works in Dev (Bun)

✅ Migration script runs successfully
✅ Database created with all tables
✅ Idempotency verified
✅ Custom paths work

#### What Needs Testing in Production (Node + sqlite3 CLI)

⚠️ **Not yet tested** - requires Docker container with sqlite3 binary

- Node runtime path (using `child_process.execSync`)
- sqlite3 CLI execution
- JSON query results parsing

### Next Steps for Production Deployment

1. **Test in Docker locally**:

   ```bash
   docker build -t tada:test .
   docker run --rm tada:test /bin/sh -c "node /app/migrate.js && ls -la /app/data"
   ```

2. **Verify sqlite3 is available**:

   ```bash
   docker run --rm tada:test sqlite3 --version
   ```

3. **Test migration output**:

   - Should see "Using Node with sqlite3 CLI"
   - Should apply both migrations
   - Should create `/app/data/db.sqlite`

4. **Test startup script**:
   ```bash
   docker run --rm tada:test /app/migrate-and-start.sh
   ```
   - Should run migrations before starting server

### Known Issues

❌ **Dev container lacks sqlite3 CLI**

- Dev container inherits `DATABASE_URL=/app/data/db.sqlite` from Dockerfile
- `/app/data` exists but is owned by `nuxt:nodejs`, not writable by `bun` user
- **Workaround**: Unset DATABASE_URL before running migrate.js in dev

✅ **Fixed**: Script now detects runtime and uses appropriate method
✅ **Fixed**: Path detection works for both dev and production
✅ **Fixed**: Directory auto-creation

### Migration File Details

**0000_careful_sauron.sql** (7 statements):

- CREATE TABLE attachments
- CREATE TABLE entries
- CREATE TABLE habits
- CREATE TABLE sessions
- CREATE TABLE timer_presets
- CREATE TABLE users
- CREATE UNIQUE INDEX users_username_unique

**0001_cheerful_steve_rogers.sql** (9 statements):

- CREATE TABLE category_settings
- ALTER TABLE entries ADD category
- ALTER TABLE entries ADD subcategory
- ALTER TABLE entries ADD emoji
- ALTER TABLE habits ADD match_type
- ALTER TABLE habits ADD match_category
- ALTER TABLE habits ADD match_subcategory
- ALTER TABLE habits ADD match_name
- ALTER TABLE timer_presets ADD subcategory

### Conclusion

✅ **Migration logic is solid and tested in dev**
✅ **Ready for Docker testing**
⚠️ **Needs production verification before deploying**

The migration script is well-designed with runtime detection and proper error handling. It works perfectly with Bun's built-in SQLite. The Node + sqlite3 CLI path is implemented but needs testing in the actual Docker production environment before pushing to CapRover.
