# Tada - Agent Instructions

This file provides context and instructions for AI coding agents working on Tada. Think of this as a README specifically for agents.

## Project Overview

Tada is a **personal lifelogger PWA** built with Nuxt 3, Vue 3, and TypeScript. It helps users track activities (meditation, dreams, habits) using a unified Entry model with offline-first architecture.

**Repository size:** Small (~50 files)  
**Languages:** TypeScript (95%), Vue (5%)  
**Framework:** Nuxt 3.20 with Vite 7.3  
**Runtime:** Bun (not Node.js!)  
**Database:** SQLite via Drizzle ORM  

## Dev Environment Tips

### Navigation
- **Root:** `/workspaces/tada/` contains Docker configs, design docs
- **App:** `/workspaces/tada/app/` is the Nuxt application
- Always `cd app` before running bun commands

### Running Commands
```bash
# Development
cd app
bun run dev           # Starts Nuxt dev server on :3000

# Building
bun run build         # Production build
bun run preview       # Preview production build

# Code Quality
bun run lint          # ESLint check
bun run lint:fix      # Auto-fix lint issues
bun run typecheck     # TypeScript compilation check

# Database
bun run db:generate   # Generate migrations from schema changes
bun run db:migrate    # Apply migrations
bun run db:studio     # Open Drizzle Studio UI on :4983

# Testing (after setup)
bun run test          # Run tests
bun run test:ui       # Visual test UI
bun run test:coverage # Coverage report
```

### Important Gotchas
- **Always use `bun` not `npm` or `pnpm`** — This project uses Bun as package manager and runtime
- **Port 3000** is the dev server, **4983** is Drizzle Studio
- **Environment:** You're in a dev container with Debian, Bun, and Git pre-installed
- **Database location:** `app/data/db.sqlite` (created on first run, gitignored)
- **Hot reload works** for Vue components and server routes

## Architecture Overview

### Unified Entry Model
**Core concept:** Everything is an `Entry` — meditation sessions, dreams, todos, journal notes.

```typescript
// Database schema: app/server/db/schema.ts
export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),        // nanoid
  userId: text('user_id'),            // FK to users
  type: text('type').notNull(),       // 'meditation', 'dream', 'tada', 'journal'
  occurredAt: text('occurred_at'),    // ISO8601 timestamp
  durationSeconds: integer('duration_seconds'),
  title: text('title'),
  notes: text('notes'),
  data: text('data', { mode: 'json' }), // Type-specific JSONB
  // ... more fields
})
```

**Key insight:** Habits are NOT separate records — they're aggregation queries over entries using matchers.

### Directory Structure
```
app/
├── pages/              # Vue pages (routes)
│   ├── index.vue       # Timeline (home)
│   ├── timer.vue       # Meditation timer
│   ├── habits.vue      # Habit tracking
│   ├── journal.vue     # Journal view
│   ├── settings.vue    # Settings
│   └── add.vue         # Quick add entry
├── layouts/
│   └── default.vue     # Main layout with nav
├── server/
│   ├── api/            # API endpoints
│   │   └── health.get.ts  # Only endpoint so far!
│   └── db/
│       ├── index.ts    # Drizzle client
│       └── schema.ts   # Full schema (users, entries, habits, etc.)
├── components/         # Vue components (none yet!)
├── composables/        # Vue composables (none yet!)
├── assets/css/         # Global CSS
└── public/             # Static files (icons, sounds)
```

### PWA Configuration
- Service worker via `@vite-pwa/nuxt`
- Manifest in `nuxt.config.ts`
- Icons in `public/icons/`
- Designed for offline-first operation

### Authentication Strategy
- Using Lucia Auth (not yet implemented)
- Sessions table already in schema
- Optional password for self-hosted (can run passwordless)

## Testing Instructions

### Current State
⚠️ **Testing framework not yet installed** — You may need to set this up first!

### When Testing is Setup
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
fix: correct timer countdown calculation
test: add unit tests for streak calculation
docs: update README with deployment guide
refactor: extract timer logic to composable
chore: upgrade Nuxt to 3.21
```

### Branch Naming
- **Manual work:** `feature/brief-description`
- **Agent work:** `copilot/brief-description` (auto-created by GitHub Copilot)

### PR Checklist
Before opening PR, verify:
- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes (when tests exist)
- [ ] New code has tests
- [ ] Updated docs if needed
- [ ] Conventional commit messages

### Code Review Process
1. CI must pass (GitHub Actions)
2. At least one review required for `main`
3. Squash merge to keep history clean

## Design Documents

**Critical reading for major changes:**
- `design/SDR.md` — Software Design Requirements (THE source of truth)
- `design/philosophy.md` — Vision, tone, what we're NOT building
- `design/decisions.md` — Technical decisions with rationale
- `design/roadmap.md` — Feature phases and priorities

**Key principles from philosophy:**
- "Noticing, not tracking" — Focus on celebration, not obligation
- Data ownership is paramount — Export must always work
- Offline-first — Must work without internet
- Simple > complex — Avoid premature optimization

## Common Tasks

### Adding a New API Endpoint
1. Create `app/server/api/your-endpoint.{get|post}.ts`
2. Import Drizzle client from `server/db`
3. Use schema types from `server/db/schema`
4. Add tests in `your-endpoint.{get|post}.test.ts`
5. Verify with `curl http://localhost:3000/api/your-endpoint`

### Adding a New Page
1. Create `app/pages/your-page.vue`
2. Update `layouts/default.vue` nav if needed
3. Route is auto-generated: `/your-page`

### Modifying Database Schema
1. Edit `app/server/db/schema.ts`
2. Run `cd app && bun run db:generate` — creates migration
3. Run `bun run db:migrate` — applies migration
4. Commit both schema AND migration files

### Adding a New Entry Type
Entry types are open (not enum). Just use them:
```typescript
const entry = {
  type: 'meditation',  // or 'dream', 'tada', 'book', 'run', etc.
  data: {
    // Type-specific fields go here
    technique: 'vipassana',
    location: 'home',
  }
}
```

## Troubleshooting

**"Module not found" errors:**
- Run `cd app && bun install` to refresh dependencies
- Check you're in `/workspaces/tada/app` directory

**Port 3000 already in use:**
- Kill existing process: `pkill -f 'bun.*dev'`
- Or change port: `PORT=3001 bun run dev`

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
```

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

When you see instructions in this file, code comments, or design documents, **trust them first** and only search/explore if:
- Instructions are incomplete
- Instructions conflict with actual code behavior
- You need more detail than provided

The design documents (especially SDR) are comprehensive and up-to-date. Start there before deep exploration.

---

**Last Updated:** January 10, 2026  
**For questions:** See design/SDR.md or design/decisions.md
