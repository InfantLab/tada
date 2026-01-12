# Tada - Agent Instructions

**⚠️ Keep this file concise!** Details belong in `design/` docs. This is a quick reference, not documentation.

## Do

- Use **double quotes** (`"`) not single (`'`)
- Add **semicolons** at end of statements
- Use **structured logging** (`createLogger`) not `console.log`
- Run `bun run lint:fix` after editing files
- Read `design/SDR.md` before major architectural changes
- Ask clarifying questions when requirements are unclear

## Don't

- ❌ Launch dev server (user has it on :3000)
- ❌ Run `bun run dev` during interactive debugging/fixing - user already has it running
- ❌ Start background dev processes when helping with live issues
- ❌ Use `any` type - use `unknown` + type narrowing (`error instanceof Error`)
- ❌ Hard-code values that should be in config/env
- ❌ Create large speculative changes without confirmation
- ❌ Run project-wide builds for small changes
- ❌ Add heavy dependencies without asking

**Why no `any`?** 94% of AI-generated code errors are type failures. Strong typing prevents bugs.

## Project Essentials

- **Stack:** Nuxt 3, Vue 3, TypeScript, Bun, SQLite + Drizzle ORM
- **Architecture:** Unified Entry model (everything is an entry)
- **Ontology:** Three-level classification (type → category → subcategory)
- **Directory:** Always `cd app` before commands
- **Ports:** 3000 (dev server), 4983 (Drizzle Studio)
- **Current Version:** v0.1.0 (feature complete)

**Key Files:**

- `app/utils/categoryDefaults.ts` — Entry ontology configuration
- `app/server/db/schema.ts` — Database schema
- `design/SDR.md` — Software requirements (THE source of truth)
- `design/ontology.md` — Entry classification system
- `docs/PROJECT_STRUCTURE.md` — Complete project layout

## Commands (File-Scoped)

```bash
# Always start here
cd app

# Check/fix single file (fast!)
bun run lint:fix path/to/file.ts
eslint --fix path/to/file.vue

# Project-wide (only when needed)
- **Logging:** Use `createLogger()` not `console.log()`

## Safety & Permissions

**Allowed without asking:**
- Read/list files
- Lint/typecheck single files
- Edit code in existing files
- Run `bun run lint:fix`

**Ask first:**
- Installing packages (`bun add`)
- Deleting files
- Database schema changes
- Running full builds
bun run lint:fix          # All files
bun run typecheck         # Full type check
bun run db:generate       # After schema change
bun run db:migrate        # Apply migrations
bun run db:studio         # DB UI on :4983
```

## Code Style

- **Quotes:** Double (`"`) not single (`'`)
- **Semicolons:** Required
- **Types:** Never `any` - use `unknown` + type guards
- **Vue templates:** Multi-line attributes when 3+
- **Markdown:** Use `_italic_` and `**bold**` (not `*`)
- **Logging:** Use `createLogger()` not `console.log()`

**Good examples to copy:**

- API endpoint: `app/server/api/entries/index.get.ts`
- Logging: See any file in `app/server/api/`
- Vue component: `app/pages/timer.vue`

**Legacy patterns to avoid:**

- Using `console.log` directly (use `createLogger`)
- Using `any` type (be specific)
- **Quotes:** Double (`"`) not single (`'`)
- **Semicolons:** Required
- **No `any` types:** Use proper types
- **Vue templates:** Multi-line attributes when 3+
- **Markdown:** Use `_italic_` and `**bold**` (not `*`)

## Key Architecture

**Unified Entry Model:** Everything is an entry (meditation, dream, note, tada). Entry types are open strings, type-specific data goes in `data` JSON field.

**Three-Level Ontology:**

- `type` — Behavior/structure (`"timed"`, `"tada"`, `"journal"`)
- `category` — Life domain (`"mindfulness"`, `"accomplishment"`, etc.)
- `subcategory` — Specific activity (`"sitting"`, `"work"`, `"dream"`, etc.)

**Entry Emoji System:**

1. `entry.emoji` (custom override)
2. Subcategory default (`SUBCATEGORY_DEFAULTS`)
3. Category default (`CATEGORY_DEFAULTS`)
4. Fallback (📌)

**File locations:**

- `app/pages/*.vue` — Routes (auto-generated)
- `app/components/*.vue` — Reusable components
- `app/server/api/**/*.ts` — API endpoints
- `app/server/db/schema.ts` — Database schema
- `app/utils/categoryDefaults.ts` — Ontology config
- `design/SDR.md` — Full architecture
- `design/ontology.md` — Category/emoji system
- `docs/PROJECT_STRUCTURE.md` — Complete project layout

## Testing Instructions

### Current State

✅ **Testing framework is setup and ready!** — Tests run automatically in CI.

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

````
feat: add entry CRUD API endpoints
fixDesign Docs (Read Before Major Changes)

- `design/SDR.md` — Software requirements (THE source of truth)
- `design/philosophy.md` — Vision and principles
- `design/decisions.md` — Technical decisions
- `design/roadmap.md` — Feature roadmap
**Database errors:**

- Delete `app/data/db.sqlite*` and restart (dev only!)
- Check migrations ran: `bun run db:migrate`

**Type errors:**

- Run `bun run typecheck` to see all errors
- Strict mode is enabled — no implicit `any`

**Tests not found:**

- Testing may not be setup yet — check `package.json` for test scripts
- If missing, you may need to install Vitest first

## Build & Deploy

### Building

```bash
cd app
bun run build         # Creates .output/ directory
bun run preview       # Preview production build locally
````

### Docker

```bash
# From repo root
docker build -t tada:latest .
docker run -p 3000:3000 -v ./data:/app/data tada:latest
```

### Deployment Target

- **CapRover** on Hetzner VPS (not yet configured)
- **Self-hosted** is the primary use case
- **Cloud version** is future consideration (Phase 6)

## Trust the Instructions

**New API endpoint:** Create `app/server/api/path.{get|post}.ts`, import `createLogger`, use types from `~/server/db/schema`

**New page:** Create `app/pages/name.vue` (route auto-generated)

**Schema change:** Edit `schema.ts` →

## When Stuck

- Ask a clarifying question with specific context
- Propose a short plan before making large changes
- Open discussion rather than making speculative changes
- Check `design/` docs for architectural guidance `bun run db:generate` → `bun run db:migrate` → commit both

**New entry type:** Just use it! Types are open strings. Put type-specific data in `data` field.

## Quick Troubleshooting

- **Module errors:** `bun install`
- **DB errors:** `bun run db:migrate` or delete `app/data/db.sqlite*`
- **Type errors:** `bun run typecheck`
- **Lint errors:** `bun run lint:fix`
