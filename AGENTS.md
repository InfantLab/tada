# Tada - Agent Instructions

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

## Project

- **Stack:** Nuxt 3 + Vue 3 + TypeScript + Bun + SQLite/Drizzle
- **Dir:** Always `cd app` before commands
- **Docs:** `design/SDR.md` (requirements), `design/ontology.md` (entry types)

## Commands (File-Scoped)

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
```

## Testing

**Current status:** 46 unit tests passing (utils only). Integration tests blocked on e2e setup.

- Unit tests: Co-locate with source (`utils/*.test.ts`)
- Integration tests: `tests/api/*.test.ts` (use @nuxt/test-utils/e2e)
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

## Trust the Instructions

**New API endpoint:** Create `app/server/api/path.{get|post}.ts`, import `createLogger`, use types from `~/server/db/schema`

**New page:** Create `app/pages/name.vue` (route auto-generated)

**Schema change:** Edit `schema.ts` → `bun run db:generate` → `bun run db:migrate` → commit both

**New entry type:** Just use it! Types are open strings. Put type-specific data in `data` field.

**CSV import:** `/import` page. Built-in Insight Timer recipe auto-created. Custom recipes saved in `import_recipes` table. 50MB limit, 500 rows/batch.

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
