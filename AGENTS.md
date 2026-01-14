# Tada - Agent Instructions

## 🚫 CRITICAL - NEVER DO THIS

- **❌ NEVER run `bun run dev`** — The user controls the dev server. It runs on :3000. Don't start, restart, or modify it.
- **❌ NEVER run `bun run test`** — It blocks the terminal waiting for interactive quit. Use VS Code Test Explorer, `runTests` tool, or add `--run` flag for non-interactive mode.
- **❌ NEVER run `sqlite3`** — sqlite3 CLI is not installed. Use `bun run db:studio` for DB UI or inspect via drizzle migrations.
- **❌ NEVER commit automatically** — Wait for the user to explicitly say "commit" or "commit this" before running git commit.
- **❌ Create documentation sparingly** — Only create documentation when there are major changes in function. Strongly favour updating existing files in /docs folder.
- **❌ NEVER use interactive commands** — Always use `--run`, `--reporter=dot`, or similar flags to prevent commands from waiting for user input.

## Code Style

- **Quotes:** `"` not `'`
- **Semicolons:** Required
- **Types:** Never `any` (use `unknown` + guards)
- **Strictness:** All code must pass TypeScript strict mode (no ts-ignore, proper null checks)
- **Logging:** `createLogger()` not `console.log`

## Don't

- ❌ Launch dev server (user has it on :3000)
- ❌ Use `any` type
- ❌ Use Bun APIs in server code (production is Node 20)
- ❌ Create test scripts in root - use `scripts/`
- ❌ Create excessive documentation
- ❌ Auto-commit changes (wait for explicit instruction)
- ❌ Create markdown summary files in root

## Project

- **Stack:** Nuxt 3 + Vue 3 + TypeScript + Bun + SQLite/Drizzle
- **Dir:** Always `cd app` before commands
- **Docs:** `design/SDR.md` (requirements), `design/ontology.md` (entry types)
- **New docs:** If explicitly requested, put in `docs/` folder, not root

## Commands (File-Scoped)

```bash
# Always start here
cd app

# Check/fix single file (fast!)
bun run lint:fix path/to/file.ts
eslint --fix path/to/file.vue

# Project-wide (only when needed)
bun run lint:fix          # All files
bun run typecheck         # Full type check
bun run db:generate       # After schema change
bun run db:migrate        # Apply migrations
bun run db:studio         # DB UI on :4983

# ⚠️ IMPORTANT: Never run `bun run test` in CLI - it blocks terminal!
# Use VS Code Test Explorer or runTests tool with limits instead
```

## Error Management

The VS Code Problems panel has been configured for clarity:

- **Errors** (❌) block compilation - fix these first
- **Warnings** (⚠️) are suggestions - fix when convenient
- **Info** (ℹ️) are hints - optional improvements

**Filtering noise:**

- `skipLibCheck: true` suppresses third-party module errors
- PWA modules have type stubs in `types/pwa-icons.d.ts`
- Node modules excluded from diagnostics

**Using the Problems panel:**

- Click error to jump to location
- Right-click → "Copy" to copy error text
- Right-click → "Copy Message" for just the message
- Filter by severity using the toolbar icons
- Use search box to filter by keyword
- `Cmd/Ctrl+Shift+M` to toggle panel

**When errors are overwhelming:**

1. Run `bun run typecheck` to see actual TS errors
2. Fix errors in production code first (not node_modules)
3. Use `// @ts-expect-error` with explanation for unavoidable issues

## Testing

**Current status:** 133 unit tests passing (7 logger tests failing - pre-existing issue with JSON format assertions). Integration tests (4 files) disabled pending @nuxt/test-utils rewrite.

- Unit tests: Co-locate with source (`utils/*.test.ts`)
- Integration tests: `tests/api/*.test.ts` (use @nuxt/test-utils/e2e)
- Disabled tests: `*.test.ts.skip` - need database/server setup
- Never create test scripts in root
- See `app/tests/README.md` for examples

### Running Tests

```bash
cd app
bun run test                    # Run all tests
bun run test --watch            # Watch mode
bun run test:ui                 # Visual UI
bun run test:coverage           # Coverage report
```

### Test File Patterns

- **Unit tests:** `*.test.ts` co-located with source
- **E2E tests:** `tests/e2e/*.spec.ts`

Example locations:

- `server/api/entries.get.test.ts` — API endpoint tests
- `composables/useTimer.test.ts` — Composable logic tests
- `tests/e2e/timer-flow.spec.ts` — Full user flows

### Testing Philosophy

- **80%+ coverage target** for unit tests
- **Test critical user flows** with E2E (timer, entry creation)
- **Co-locate tests** with implementation when possible
- **Test behavior, not implementation** details

### Running Tests in CI

The CI pipeline (when setup) runs:

1. `bun run lint` — Must pass
2. `bun run typecheck` — Must pass
3. `bun run test` — Must pass
4. `bun run build` — Must succeed

## PR Instructions

### Commit Message Format

Use **conventional commits:**

```
feat: add entry CRUD API endpoints
fix: handle null timestamps
docs: update testing guide
```

## Design Docs (Read Before Major Changes)

- `design/SDR.md` — Software requirements (THE source of truth)
- `design/philosophy.md` — Vision and principles
- `design/decisions.md` — Technical decisions
- `design/roadmap.md` — Feature roadmap

## CSV Import Feature (v0.2.0+)

**Status:** 73% complete. See [`docs/CSV_IMPORT_COMPLETION_REVIEW.md`](docs/CSV_IMPORT_COMPLETION_REVIEW.md) for detailed analysis.

**Quick Reference:**

- **User Entry:** Visit `/import` or Settings → Import Data
- **Built-in Recipe:** Insight Timer automatically configured, just upload your CSV export
- **Custom Recipe:** Save your column mappings to reuse on future imports
- **Workflow:** File Upload → Column Mapping → Data Validation → Import

**API Endpoints:**

```
POST   /api/import/entries               # Perform bulk import (rate limited)
GET    /api/import/recipes               # List recipes (auto-creates Insight Timer)
POST   /api/import/recipes               # Save new recipe
GET    /api/import/recipes/[id]          # Get recipe details
DELETE /api/import/recipes/[id]          # Delete recipe
POST   /api/import/recipes/[id]/restore  # Restore previous version
GET    /api/import/logs                  # Import audit trail
```

**Parser Utilities:**

- `csvParser.ts`: parseCSV, detectDateFormat, parseDuration, parseDateTime, generateExternalId
- `columnDetection.ts`: Auto-detect entry fields with confidence scoring

**Database Tables:**

- `import_recipes` (id, userId, name, columnMapping, isBuiltIn, previousVersions)
- `import_logs` (id, userId, recipeId, status, totalRows, successfulRows, errors)

**Known Limitations:**

- ⚠️ Task 3.5: Timezone/date format selector UI not yet implemented (backend ready)
- ⚠️ Task 4.4: Recipe rollback UI controls missing (backend supports it)
- ⚠️ Task 5.4: E2E tests not yet written (recommend `@nuxt/test-utils`)

## Trust the Instructions

**New API endpoint:** Create `app/server/api/path.{get|post}.ts`, import `createLogger`, use types from `~/server/db/schema`

**New page:** Create `app/pages/name.vue` (route auto-generated)

**Schema change:** Edit `schema.ts` → `bun run db:generate` → `bun run db:migrate` → commit both

**New entry type:** Just use it! Types are open strings. Put type-specific data in `data` field.

**CSV import (v0.2.0+):** See `docs/CSV_IMPORT_COMPLETION_REVIEW.md` for full feature status. Quick facts:

- Page: `/import` with recipe selector and wizard
- Built-in Insight Timer recipe auto-created on first access
- Custom recipes saved with version history (up to 3 rollbacks)
- API: `POST /api/import/entries` with batching (500 rows/txn)
- Limits: 50MB files, 1 import/10 seconds per user, auto-deduplication
- Auto-detection: Date formats, durations, column mapping with confidence scoring
- Database: `import_recipes` and `import_logs` tables for recipes and audit trail
- See Task 3.5 status: Timezone/format selectors UI still needed

## Quick Troubleshooting

- **Module errors:** `bun install`
- **DB errors:** `bun run db:migrate` or delete `app/data/db.sqlite*`
- **Type errors:** `bun run typecheck`
- **Lint errors:** `bun run lint:fix`

## When Stuck

- Ask a clarifying question with specific context
- Propose a short plan before making large changes
- Open discussion rather than making speculative changes
- Check `design/` docs for architectural guidance
