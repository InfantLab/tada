# Tada Project Structure

This document provides a comprehensive overview of the Tada codebase organization.

## Repository Layout

```
tada/
├── app/                          # Nuxt 3 application (main codebase)
├── design/                       # Design documents and specifications
├── docs/                         # Developer documentation
├── old_data/                     # Sample/legacy import data
├── AGENTS.md                     # AI agent instructions
├── CHANGELOG.md                  # Version history
├── docker-compose.yml            # Container orchestration
├── Dockerfile                    # Production container
├── LICENSE                       # AGPL-3.0 license
└── README.md                     # Project overview
```

## Application Structure (`app/`)

### Core Directories

```
app/
├── assets/                       # Uncompiled assets (CSS, images)
│   └── css/
│       └── main.css              # Global Tailwind imports
├── components/                   # Reusable Vue components
│   ├── EmojiPicker.vue           # Full emoji selection modal
│   └── [future components]
├── composables/                  # Vue composables (shared logic)
│   └── [future: useTimer, useEntries, etc.]
├── data/                         # Runtime data directory
│   ├── db.sqlite                 # SQLite database (auto-created)
│   └── logs/                     # Application logs
├── layouts/                      # Page layouts
│   └── default.vue               # Standard app layout with nav
├── middleware/                   # Route middleware
│   └── auth.global.ts            # Global auth check
├── pages/                        # File-based routing (see below)
├── public/                       # Static assets (served as-is)
│   ├── icons/                    # PWA icons and app assets
│   ├── sounds/                   # Bell sounds for timer
│   └── freesounds.org/           # Attribution for sounds
├── server/                       # Server-side code (see below)
├── utils/                        # Client-side utilities
│   ├── categoryDefaults.ts       # Ontology configuration
│   └── logger.ts                 # Client logging utility
├── app.vue                       # Root Vue component
├── check-db.mjs                  # Database connection test script
├── drizzle.config.ts             # Drizzle ORM configuration
├── eslint.config.mjs             # ESLint configuration
├── nuxt.config.ts                # Nuxt framework configuration
├── package.json                  # Dependencies and scripts
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── vitest.config.ts              # Test configuration
```

### Pages (`app/pages/`)

File-based routing — each `.vue` file becomes a route:

```
pages/
├── index.vue                     # Timeline (/) — Home feed
├── sessions.vue                  # Sessions (/sessions) — Timed activities
├── tally.vue                     # Tally (/tally) — Count/reps tracking
├── moments.vue                   # Moments (/moments) — Dreams, notes, reflections
├── add.vue                       # Add Entry (/add) — Quick capture
├── rhythms.vue                   # Rhythms (/rhythms) — Habit tracking
├── settings.vue                  # Settings (/settings) — Export, bells, auth
├── login.vue                     # Login (/login) — Authentication
├── tada/
│   ├── index.vue                 # Ta-Da! (/tada) — Accomplishments
│   └── history.vue               # Ta-Da! History (/tada/history)
└── entry/
    └── [id].vue                  # Entry Detail (/entry/123) — Single entry view
```

### Server Structure (`app/server/`)

Server-side code using Nuxt's Nitro engine:

```
server/
├── api/                          # REST API endpoints
│   ├── health.get.ts             # Health check
│   ├── auth/
│   │   ├── has-users.get.ts      # Check if any users exist
│   │   ├── login.post.ts         # User login
│   │   ├── logout.post.ts        # User logout
│   │   ├── register.post.ts      # User registration
│   │   └── session.get.ts        # Get current session
│   └── entries/
│       ├── index.get.ts          # List entries (GET /api/entries)
│       ├── index.post.ts         # Create entry (POST /api/entries)
│       ├── [id].delete.ts        # Delete entry (DELETE /api/entries/:id)
│       ├── [id].get.ts           # Get single entry (GET /api/entries/:id)
│       └── [id].patch.ts         # Update entry (PATCH /api/entries/:id)
├── db/                           # Database layer
│   ├── index.ts                  # Database connection (Drizzle client)
│   ├── schema.ts                 # Database schema (users, entries, rhythms, etc.)
│   └── migrations/               # Drizzle migrations (auto-generated)
│       ├── 0000_careful_sauron.sql
│       ├── 0001_cheerful_steve_rogers.sql
│       └── meta/                 # Migration metadata
├── middleware/
│   └── auth.ts                   # Server-side auth middleware
├── plugins/
│   └── error-handler.ts          # Global error handling
└── utils/
    ├── auth.ts                   # Lucia Auth setup
    └── logger.ts                 # Server logging utility
```

## Design Documents (`design/`)

```
design/
├── SDR.md                        # Software Design Requirements (THE source of truth)
├── philosophy.md                 # Vision, principles, tone
├── ontology.md                   # Entry classification system
├── decisions.md                  # Technical decision records
├── roadmap.md                    # Version roadmap (v0.1.0 - v0.3.0+)
├── color-palette.md              # Visual design system
├── visual design.md              # UI/UX guidelines
└── alternatives.md               # Competitive analysis
```

## Developer Documentation (`docs/`)

```
docs/
├── DEVELOPER_GUIDE.md            # Complete development guide
├── PROJECT_STRUCTURE.md          # This file!
├── terminal-behavior.md          # Terminal/shell behavior notes
└── dev/
    ├── v010-snagging-list.md     # v0.1.0 QA issues
    └── v010_ontology.md          # v0.1.0 ontology implementation plan
```

## Configuration Files

### Root Level

- **`docker-compose.yml`** — Multi-container orchestration (app + dev profiles)
- **`Dockerfile`** — Production container image (Alpine Linux, Bun runtime)
- **`LICENSE`** — AGPL-3.0 license text
- **`AGENTS.md`** — Instructions for AI-assisted development
- **`CHANGELOG.md`** — Version history and release notes
- **`README.md`** — Project overview and quick start

### App Level (`app/`)

- **`nuxt.config.ts`** — Nuxt 3 framework configuration (PWA, Tailwind, modules)
- **`tsconfig.json`** — TypeScript compiler options (strict mode enabled)
- **`eslint.config.mjs`** — Linting rules (TypeScript, Vue, strict)
- **`tailwind.config.ts`** — Tailwind CSS theme (tada color palette)
- **`drizzle.config.ts`** — ORM configuration (SQLite dialect, migration path)
- **`vitest.config.ts`** — Test runner configuration
- **`package.json`** — Dependencies and npm scripts

## Key Architectural Patterns

### Unified Entry Model

**Everything is an entry.** No separate tables for meditations, dreams, tadas. One `entries` table with:

- `type` (behavior) — `"timed"`, `"tada"`, `"journal"`
- `category` (domain) — `"mindfulness"`, `"accomplishment"`, etc.
- `subcategory` (specific) — `"sitting"`, `"work"`, `"dream"`, etc.
- `emoji` (visual) — Custom or default based on category/subcategory

### File-Based Routing

Pages in `app/pages/` automatically become routes. No manual route configuration needed.

### API Convention

- `*.get.ts` — GET endpoints
- `*.post.ts` — POST endpoints
- `*.patch.ts` — PATCH endpoints
- `*.delete.ts` — DELETE endpoints
- `[id].*.ts` — Dynamic route parameters

### Server vs Client

- **`app/server/`** — Runs on Nitro server (API routes, database, auth)
- **`app/pages/`, `app/components/`** — Runs in browser (Vue, client-side)
- **`app/utils/`** — Shared utilities (imported by both)

### Logging

- **Server:** `import { createLogger } from "~/server/utils/logger"`
- **Client:** `import { createLogger } from "~/utils/logger"`

Both use structured JSON logging with log levels (debug, info, warn, error).

## Data Flow

```
User Browser
    ↓
Vue Pages (pages/*.vue)
    ↓
$fetch() / useFetch()
    ↓
API Routes (server/api/**/*.ts)
    ↓
Drizzle ORM (server/db/index.ts)
    ↓
SQLite Database (data/db.sqlite)
```

## Adding Features

### New Page

1. Create `app/pages/my-page.vue`
2. Route automatically available at `/my-page`
3. Add link in `app/layouts/default.vue` navigation

### New API Endpoint

1. Create `app/server/api/resource/action.method.ts`
2. Endpoint available at `/api/resource/action`
3. Use `createLogger`, handle auth, return JSON

### New Database Table

1. Add schema to `app/server/db/schema.ts`
2. Run `bun run db:generate` (creates migration)
3. Run `bun run db:migrate` (applies migration)
4. Commit both schema change and migration files

### New Entry Type/Category

No code changes needed! Just start using new `type`, `category`, or `subcategory` values. Add defaults to `app/utils/categoryDefaults.ts` for emoji/color support.

## Build Artifacts

**Development:**

- `.nuxt/` — Nuxt build cache (gitignored)
- `node_modules/` — Dependencies (gitignored)
- `data/db.sqlite*` — Development database (gitignored)

**Production:**

- `.output/` — Nuxt production build (created by `bun run build`)
- Docker image — Multi-stage build, final size ~150MB

## Important Notes

1. **Always `cd app` before running commands** — The Nuxt app is in the `app/` directory
2. **Database location** — `app/data/db.sqlite` (auto-created on first run)
3. **Logs location** — `app/data/logs/` (structured JSON logs)
4. **Static assets** — Only files in `app/public/` are served directly
5. **Migrations** — Always commit generated migration files with schema changes

## Next Steps

- **Development:** See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
- **Architecture:** See [design/SDR.md](../design/SDR.md)
- **Ontology:** See [design/ontology.md](../design/ontology.md)
- **Contributing:** See [README.md](../README.md#contributing)
