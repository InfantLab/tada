# Tada Developer Guide

Welcome to Tada development! This guide covers everything you need to build, test, and contribute to Tada.

## Getting Started

### Prerequisites

- **Bun** (package manager and runtime) — Installed in dev container, or [install locally](https://bun.sh)
- **Git** — For version control
- **VS Code** (recommended) — With Dev Containers extension

### Clone the Repository

```bash
git clone https://github.com/InfantLab/tada.git
cd tada
```

### Setup Options

**Option 1: Dev Container (Recommended)**

1. Open the project in VS Code
2. Install the "Dev Containers" extension if not already installed
3. Click "Reopen in Container" when prompted
4. Run setup:
   ```bash
   cd app
   bun install
   bun run dev
   ```

**Option 2: Local Development**

```bash
cd app
bun install
bun run dev
```

**Option 3: Docker**

```bash
# Production mode
docker compose up -d

# Development mode with hot reload
docker compose --profile dev up tada-dev
```

The app runs on `http://localhost:3000`

## Development Commands

```bash
# Development
bun run dev           # Start dev server with hot reload (:3000)

# Building
bun run build         # Production build
bun run preview       # Preview production build locally

# Code Quality
bun run lint          # Check code style with ESLint
bun run lint:fix      # Auto-fix linting issues
bun run typecheck     # Verify TypeScript compilation

# Database
bun run db:generate   # Generate migrations from schema changes
bun run db:migrate    # Apply pending migrations
bun run db:studio     # Open Drizzle Studio UI (:4983)

# Testing
bun run test          # Run all tests
bun run test:ui       # Visual test UI
bun run test:coverage # Generate coverage report
```

## Project Structure

```
tada/
├── app/                      # Nuxt 3 application
│   ├── pages/                # Vue pages (Timeline, Timer, Habits, Journal)
│   │   ├── index.vue         # Timeline (home)
│   │   ├── timer.vue         # Meditation timer
│   │   ├── habits.vue        # Habit tracking
│   │   ├── journal.vue       # Journal view
│   │   ├── settings.vue      # Settings
│   │   └── add.vue           # Quick add entry
│   ├── layouts/
│   │   └── default.vue       # Main layout with navigation
│   ├── components/           # Vue components (none yet)
│   ├── composables/          # Vue composables (none yet)
│   ├── server/
│   │   ├── api/              # REST API endpoints
│   │   │   └── health.get.ts # Health check endpoint
│   │   └── db/               # Database layer
│   │       ├── index.ts      # Drizzle client
│   │       └── schema.ts     # Database schema
│   ├── assets/css/           # Global CSS
│   └── public/               # Static assets (icons, sounds)
├── design/                   # Design documents
│   ├── SDR.md                # Software Design Requirements
│   ├── philosophy.md         # Vision and principles
│   ├── decisions.md          # Technical decisions with rationale
│   ├── roadmap.md            # Feature phases
│   └── alternatives.md       # Competitive analysis
├── docs/                     # Documentation
│   └── DEVELOPER_GUIDE.md    # This file
├── old_data/                 # Sample import data
├── AGENTS.md                 # Instructions for AI agents
├── Dockerfile                # Production container
└── docker-compose.yml        # Container orchestration
```

## Architecture Overview

### Tech Stack

- **Framework**: [Nuxt 3](https://nuxt.com/) + Vue 3
- **Language**: TypeScript (strict mode)
- **Database**: SQLite via [Drizzle ORM](https://orm.drizzle.team/)
- **PWA**: [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/frameworks/nuxt.html)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Auth**: [Lucia](https://lucia-auth.com/) (planned)
- **Runtime**: Bun (not Node.js!)

### Unified Entry Model

**Core concept:** Everything is an `Entry` — meditation sessions, dreams, todos, journal notes, workouts, books read, etc.

```typescript
interface Entry {
  id: string; // nanoid
  userId: string; // FK to users
  type: string; // 'meditation', 'dream', 'tada', 'journal', etc.
  occurredAt: Date; // When it happened
  durationSeconds?: number;
  title?: string;
  notes?: string;
  data?: object; // Type-specific metadata (JSONB)
}
```

**Key insight:** Habits are NOT separate records — they're aggregation queries over entries using matchers.

### Database Details

- **Engine**: SQLite (self-hosted) / PostgreSQL (cloud)
- **ORM**: Drizzle with TypeScript types
- **Location**: `app/data/db.sqlite` (gitignored)
- **Schema**: `app/server/db/schema.ts`

The schema defines:

- `users` — User accounts
- `sessions` — Lucia auth sessions
- `entries` — Main data table (all activities)
- `habits` — Habit definitions (query patterns)
- `tags` — Optional tagging system

### PWA Configuration

- **Offline-first** via service worker (Workbox)
- **Caching strategy**:
  - Cache-first: Static assets (JS, CSS, images, audio)
  - Network-first: API calls
  - IndexedDB: Offline data storage (via Dexie.js)
- **Manifest**: Defined in `nuxt.config.ts`
- **Icons**: Located in `public/icons/`
- **Install to home screen**: Gives app-like experience

### iOS Timer Handling

iOS Safari limits background execution for PWAs. Our solution:

- Web Worker for timing (survives tab backgrounding on Android/desktop)
- Save timer state to IndexedDB every second
- Resume gracefully if app was killed
- Push notification on completion (iOS 16.4+ when PWA installed)

## Development Workflow

### Git Workflow

We use **conventional commits** for clear history:

```bash
feat: add entry CRUD API endpoints
fix: correct timer countdown calculation
test: add unit tests for streak calculation
docs: update README with testing guide
refactor: extract timer logic to composable
chore: upgrade Nuxt to 3.21
```

**Branch Strategy:**

- `main` — Always deployable, protected
- `feature/description` — Human-authored features
- `copilot/description` — AI agent-authored changes (auto-created by GitHub Copilot)

**Pull Request Process:**

1. Create feature branch from `main`
2. Make changes with tests
3. Commit using conventional commit format
4. Push and open PR (CI runs automatically)
5. Get code review
6. Merge to `main` (squash merge preferred)

### Testing Philosophy

**Goals:**

- 80%+ unit test coverage target
- Critical user flows covered by E2E tests
- Co-locate tests with implementation

**Test Structure:**

```
app/
├── server/api/
│   ├── entries.get.ts
│   └── entries.get.test.ts       ← API endpoint tests
├── composables/
│   ├── useTimer.ts
│   └── useTimer.test.ts          ← Logic/composable tests
└── tests/e2e/
    └── timer-flow.spec.ts        ← Full user flow tests
```

**Test-Driven Development:**

- Write tests first when possible
- Test behavior, not implementation details
- Keep tests focused and readable

## Common Development Tasks

### Adding an API Endpoint

1. Create the endpoint file:

   ```bash
   # For GET requests
   touch app/server/api/entries.get.ts

   # For POST requests
   touch app/server/api/entries.post.ts
   ```

2. Implement the handler:

   ```typescript
   // app/server/api/entries.get.ts
   import { db } from "~/server/db";
   import { entries } from "~/server/db/schema";

   export default defineEventHandler(async (event) => {
     const allEntries = await db.select().from(entries);
     return allEntries;
   });
   ```

3. Add tests:

   ```typescript
   // app/server/api/entries.get.test.ts
   import { describe, it, expect } from "vitest";
   // ... test implementation
   ```

4. Test manually:
   ```bash
   curl http://localhost:3000/api/entries
   ```

### Adding a New Page

1. Create the Vue component:

   ```bash
   touch app/pages/your-page.vue
   ```

2. Implement using Composition API:

   ```vue
   <script setup lang="ts">
   // Your component logic
   </script>

   <template>
     <div>
       <!-- Your template -->
     </div>
   </template>
   ```

3. Route auto-generates as `/your-page`

4. Update navigation in `layouts/default.vue` if needed

### Modifying the Database Schema

1. Edit the schema file:

   ```bash
   code app/server/db/schema.ts
   ```

2. Make your changes to the schema:

   ```typescript
   export const entries = sqliteTable("entries", {
     // Add new fields
     newField: text("new_field"),
   });
   ```

3. Generate migration:

   ```bash
   cd app
   bun run db:generate
   ```

4. Review the generated SQL in `drizzle/` directory

5. Apply the migration:

   ```bash
   bun run db:migrate
   ```

6. **Important**: Commit both the schema file AND the migration files

### Adding a New Entry Type

Entry types are flexible (not an enum). Just use them:

```typescript
const meditationEntry = {
  type: "meditation",
  data: {
    technique: "vipassana",
    location: "home",
  },
};

const workoutEntry = {
  type: "workout",
  data: {
    exercise: "running",
    distance: 5.2,
    unit: "km",
  },
};
```

No schema changes needed — type-specific data goes in the `data` JSONB field.

## Code Style Guidelines

- **TypeScript strict mode** — Required, no implicit `any`
- **ESLint + Prettier** — Auto-format on save (configured)
- **Vue 3 Composition API** — Use `<script setup>` syntax
- **Tailwind CSS** — Prefer utility classes over custom CSS
- **File naming**:
  - Pages: `kebab-case.vue`
  - Components: `PascalCase.vue`
  - Composables: `useFeatureName.ts`
  - Tests: `*.test.ts` or `*.spec.ts`

## Agent-Assisted Development

This project embraces GitHub Copilot and AI agents. You can leverage them to:

### In VS Code

- **Chat with `@workspace`** — Ask codebase questions
- **Use `/plan`** — Generate implementation plans
- **Use `/test`** — Generate test cases
- **Reference `#codebase`** — Workspace-wide searches

### On GitHub

1. Create an issue with detailed acceptance criteria
2. Assign to `@copilot` (requires GitHub Copilot Enterprise)
3. Agent autonomously creates a PR
4. Review, iterate via PR comments, merge when ready

### Custom Workflows

- See [AGENTS.md](../AGENTS.md) for detailed agent instructions
- Design documents in `/design` provide context for agents

## CI/CD Pipeline

Every push to `main` or PR triggers automated checks:

- ✅ ESLint code style check
- ✅ TypeScript compilation
- ✅ Unit tests with coverage report
- ✅ Build verification

Merges to `main` additionally trigger:

- ✅ Docker image build
- ✅ Push to GitHub Container Registry (`ghcr.io`)

## Troubleshooting

### Common Issues

| Problem                      | Solution                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Module not found errors**  | Run `cd app && bun install` to refresh dependencies                                                   |
| **Port 3000 already in use** | Kill existing process: `pkill -f 'bun.*dev'`<br>Or use different port: `PORT=3001 bun run dev`        |
| **Database errors**          | Delete `app/data/db.sqlite*` and restart (dev only!)<br>Or check migrations ran: `bun run db:migrate` |
| **TypeScript errors**        | Run `bun run typecheck` to see all errors<br>Check you're using strict mode correctly                 |
| **Tests not found**          | Ensure testing framework is installed<br>Check `package.json` for test scripts                        |
| **Hot reload not working**   | Restart dev server<br>Check file is in watched directory                                              |
| **PWA not updating**         | Clear service worker cache<br>Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)                |

### Debug Tips

**View logs:**

```bash
# Server-side logs
cd app && bun run dev

# Browser console for client-side
# Open DevTools > Console
```

**Database inspection:**

```bash
cd app && bun run db:studio
# Opens Drizzle Studio on http://localhost:4983
```

**API testing:**

```bash
# Test GET endpoint
curl http://localhost:3000/api/health

# Test POST endpoint with data
curl -X POST http://localhost:3000/api/entries \
  -H "Content-Type: application/json" \
  -d '{"type":"meditation","title":"Morning session"}'
```

## Design Principles

Tada follows these core principles (from [design/philosophy.md](../design/philosophy.md)):

- **"Noticing, not tracking"** — Focus on celebration, not obligation
- **Data ownership** — Users own their data, export must always work
- **Offline-first** — Must work without internet connection
- **Simple > Complex** — Avoid premature optimization
- **Plugin architecture** — Keep core minimal, extend via plugins

## Next Steps

### For New Contributors

1. ✅ Read this guide
2. ✅ Read [design/philosophy.md](../design/philosophy.md) — Understand the "why"
3. ✅ Read [design/SDR.md](../design/SDR.md) — Detailed requirements
4. ✅ Check [design/roadmap.md](../design/roadmap.md) — See what's planned
5. ✅ Look at open issues on GitHub
6. ✅ Start with a small contribution

### For AI Agents

See [AGENTS.md](../AGENTS.md) for comprehensive agent-specific instructions, including:

- Project architecture details
- Testing strategies
- Commit message formats
- Common patterns and gotchas

## Contributing

We welcome contributions! Please:

1. **Start with an issue** — Check existing issues or create a new one
2. **Follow conventions** — Use conventional commits, co-locate tests
3. **Write tests** — Aim for 80%+ coverage for new code
4. **Update docs** — If you change behavior, update relevant docs
5. **Keep PRs focused** — One feature/fix per PR

For major changes, discuss in an issue first to ensure alignment.

## Resources

- **Repository**: https://github.com/InfantLab/tada
- **License**: [AGPL-3.0](../LICENSE)
- **Design Docs**: [`/design`](../design/)
- **Agent Instructions**: [AGENTS.md](../AGENTS.md)

---

**Questions?** Open an issue or check the design documents for guidance.
