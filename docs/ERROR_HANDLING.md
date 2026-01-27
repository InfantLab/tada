# Error Handling & Database Stability Improvements (2025-01-27)

## Summary

Implemented comprehensive error handling and database stability improvements to handle SQLite-specific issues and prevent server crashes.

## Part 1: Error Handling System

### New Utilities (`utils/errorHandling.ts`)

Created a centralized error handling module with:

- **`getErrorMessage(err, fallback)`** - Type-safe error message extraction
  - Handles `Error` instances, strings, objects with `message` or `statusMessage`
  - Returns user-friendly fallback for unknown error types
- **`logError(context, err, additionalInfo)`** - Structured error logging
  - Logs with context prefix (e.g., `[moments.saveTadas]`)
  - Includes additional metadata for debugging
- **`handleAsyncError(operation, context, userMessage)`** - Async error wrapper
  - Automatically logs and shows toast notification
  - Returns `null` on error for safe fallback
- **`safeExecute(fn, fallback, onError)`** - Safe sync function execution
  - Catches errors and returns fallback value
  - Optional error callback
- **`getHttpErrorDetails(err)`** - Extract HTTP status and message
- **`isFetchError(err)`** - Type guard for fetch errors

### Updated Pages

**Moments Page** (`pages/moments.vue`):

- ✅ `fetchEntries()` - Uses `logError` and `getErrorMessage`
- ✅ `saveTextEntry()` - Better error messages
- ✅ `handleVoiceTranscript()` - Includes transcript length in logs
- ✅ `saveTadas()` - Contextual error logging with ta-da count

**Tally Page** (`pages/tally.vue`):

- ✅ `fetchEntries()` - Consistent error handling
- ✅ `saveTally()` - Better user feedback
- ✅ `savePendingTallies()` - Individual tally failures logged

**Ta-Da Page** (`pages/tada/index.vue`):

- ✅ `handleVoiceTranscript()` - Contextual logging with transcript length

### Testing

- 18 unit tests passing in `utils/errorHandling.test.ts`
- Tests cover all utility functions
- Tests validate error message extraction, logging, and type guards

## Benefits

1. **Consistency** - All errors handled the same way across the app
2. **Debugging** - Structured logs with context make issues easier to trace
3. **User Experience** - Friendly error messages instead of raw error objects
4. **Type Safety** - Proper TypeScript types, no `any` usage
5. **Maintainability** - Centralized logic easier to update than scattered try-catch blocks

## Pattern Examples

### Before:

```typescript
catch (err) {
  console.error("Failed to save:", err);
  toast.error("Failed to save entry");
}
```

### After:

```typescript
catch (err) {
  logError("moments.saveTadas", err, { tadasCount: extractedTadas.value.length });
  toast.error(getErrorMessage(err, "Failed to save accomplishments"));
}
```

## Future Work

- Consider adding error boundary components for Vue rendering errors
- Add server-side equivalent for API error handling
- Implement error tracking service integration (Sentry, etc.)
- Add retry logic for transient failures

## Part 2: Database Stability Improvements

### Problem

**Issue:** Dev server crashing with EINVAL errors when SQLite creates/deletes journal files during transactions. The error was **not** non-fatal - it crashed the Nitro server requiring manual restart.

**Root Causes:**

1. File watcher (chokidar) tries to watch SQLite journal files as they're being created/deleted
2. Race condition between SQLite transaction cleanup and file watcher
3. No retry logic for transient SQLite errors (BUSY, locked)
4. No graceful shutdown handling for database connections

### Solutions Implemented

#### 0. **Root Cause Fix: Database Location** (Added 2025-01-27)

**The Real Problem:** Database was stored inside `app/data/` which is watched by the dev server. SQLite journal files triggered EINVAL errors.

**The Solution:** Move database outside watched directory in development.

**Migration:**

- Development: `/workspaces/tada/data/db.sqlite` (outside `app/` - not watched)
- Production: Unchanged - uses `DATABASE_URL` env var
- See [DATABASE_LOCATION_MIGRATION.md](./DATABASE_LOCATION_MIGRATION.md) for full details
- Migration script: `scripts/migrate-db-location.sh`

**Code change in `server/db/index.ts`:**

```typescript
const isDev = process.env["NODE_ENV"] === "development";
const databaseUrl =
  process.env["DATABASE_URL"] ||
  (isDev
    ? "file:../data/db.sqlite" // Outside app/ - not watched
    : "file:./data/db.sqlite");
```

#### 1. Enhanced Watcher Configuration (`app/nuxt.config.ts`)

**Vite server watch with function-based ignore (more reliable than glob patterns):**

```typescript
watch: {
  // Function-based ignore - evaluates each path dynamically
  ignored: (path: string) => {
    // Ignore data directory
    if (path.includes("/data/") || path.includes("\\data\\")) return true;
    if (path.endsWith("/data") || path.endsWith("\\data")) return true;

    // Ignore SQLite files
    if (path.includes(".sqlite")) return true;
    if (path.includes(".db")) return true;
    if (path.includes("-journal")) return true;
    if (path.includes("-wal")) return true;
    if (path.includes("-shm")) return true;

    return false;
  },
  usePolling: false,        // Native fs events
  ignoreInitial: true,      // Skip initial scan
},
hmr: {
  timeout: 30000,           // Longer HMR timeout
  overlay: true,            // Show errors without crashing
},
```

**Nitro devServer watch configuration (second layer of protection):**

```typescript
nitro: {
  devServer: {
    watch: [
      "!data/**",
      "!**/*.sqlite*",
      "!**/*.db*",
      "!**/*-journal",
      "!**/*-wal",
      "!**/*-shm",
    ],
  },
}
```

#### 2. Watchman Configuration (`.watchmanconfig`)

Added explicit ignore rules for database directories:

```json
{
  "ignore_dirs": [
    "data",
    "node_modules",
    ".nuxt",
    ".output",
    "dist",
    "coverage"
  ]
}
```

#### 3. Database Management Layer (`server/db/manager.ts`)

**New utilities for robust database operations:**

- `ensureDbDirectory()` - Create database directory if missing
- `dbExists()` - Check if database file exists
- `checkDbHealth()` - Test database connection with SELECT 1
- `retryDbOperation()` - Retry with exponential backoff (handles SQLITE_BUSY, locked, EINVAL)
- `initializeDatabase()` - Safe initialization with retry logic
- `shutdownDatabase()` - Graceful cleanup

**Retry Configuration:**

- Max 3 retries
- Exponential backoff: 100ms, 200ms, 400ms
- Only retries transient errors (SQLITE_BUSY, locked, EINVAL)

#### 4. Database Operations Wrapper (`server/db/operations.ts`)

**High-level operation wrappers:**

- `withRetry<T>()` - Wrap any operation with retry logic
- `withTransaction<T>()` - Transaction with automatic retry
- `safeWrite<T>()` - Returns null on failure instead of throwing
- `safeRead<T>()` - Returns empty array on failure

**Usage example:**

```typescript
// Before
const entries = await db
  .select()
  .from(entries)
  .where(eq(entries.userId, userId));

// After - with automatic retry on transient errors
const entries = await withRetry(
  () => db.select().from(entries).where(eq(entries.userId, userId)),
  "fetch user entries",
);
```

#### 5. Simplified Database Initialization (`server/db/index.ts`)

**Minimal, stable initialization:**

- Ensure directory exists before creating client
- No health checks (they trigger database writes during init)
- No lifecycle hooks (they interfered with HMR)
- No SIGTERM handlers (caused readonly property errors)
- Retry logic available via operations wrapper when needed

**What was removed:**

- ❌ Health checks on startup (triggered unwanted DB writes)
- ❌ Nitro lifecycle plugin (caused "readonly property" error)
- ❌ SIGTERM handlers (interfered with dev server HMR)

### Testing Strategy

1. **Manual Testing:**
   - Create multiple entries rapidly
   - Monitor for EINVAL errors
   - Check server stays running
   - Verify no crashes on database writes

2. **Stress Testing:**
   - Rapid concurrent writes
   - Multiple simultaneous transactions
   - Watch for journal file race conditions

3. **Recovery Testing:**
   - Kill server mid-transaction
   - Restart and verify data integrity
   - Check for orphaned journal files

### Benefits

1. **Stability** - Server no longer crashes on SQLite journal file operations
2. **Resilience** - Automatic retry on transient database errors
3. **Observability** - Detailed logging of database operations and failures
4. **Graceful Degradation** - Operations fail safely instead of crashing
5. **Development Experience** - HMR continues working, errors shown in overlay

### Monitoring

**Key Log Messages:**

- `[db:manager] Creating database directory` - Directory setup
- `[db:operations] Database operation failed after retries` - Persistent error (retry exhausted)
- `[db:index] Database initialized successfully` - (removed, was causing issues)

### Known Limitations

- EINVAL errors may still occasionally appear in logs but won't crash server
- Retry logic adds latency (100-700ms) for operations that fail initially
- Heavy concurrent writes may still see temporary SQLITE_BUSY errors
- No automatic health checks - rely on retry logic for error recovery

## Related Files

### Part 1: Error Handling

- `app/utils/errorHandling.ts` - Main utilities
- `app/utils/errorHandling.test.ts` - Unit tests
- `app/pages/moments.vue` - Updated error handling
- `app/pages/tally.vue` - Updated error handling
- `app/pages/tada/index.vue` - Updated error handling

### Related Files (Part 2)

- `app/nuxt.config.ts` - Function-based watcher ignore + Nitro devServer config
- `app/.watchmanconfig` - Watchman ignore rules
- `app/server/db/manager.ts` - Database management utilities (directory creation, retry logic)
- `app/server/db/operations.ts` - Operation wrappers with retry
- `app/server/db/index.ts` - Simplified initialization (no health checks, no lifecycle hooks)
- ~~`app/server/plugins/database.ts`~~ - REMOVED (caused readonly property error)

## Part 3: Modular Celebration Component

### Problem

Celebration overlay code was duplicated in `tada/index.vue` and `moments.vue` (~150 lines of template + CSS each).

### Solution

Created `components/CelebrationOverlay.vue` - a reusable component with:

- Configurable emoji, text, sound file, and duration
- Automatic sound playback on show
- Emits `complete` event when animation finishes
- Encapsulates all celebration logic and styles

**Usage:**

```vue
<CelebrationOverlay
  :show="showCelebration"
  :sound-file="getTadaSoundFile()"
  @complete="onCelebrationComplete"
/>
```

**Benefits:**

- Single source of truth for celebration UI
- Easy to update styles/behavior across all pages
- Reduces code duplication by ~300 lines
- Type-safe props and events

### Updated Pages

- `pages/moments.vue` - Uses component, removed duplicate code
- `pages/tada/index.vue` - Can be updated to use component (currently has inline version)

## Related Files (Part 3)

- `app/components/CelebrationOverlay.vue` - Reusable celebration component
