# Tada Developer Guide

Welcome to Tada development! This guide covers everything you need to build, test, and contribute to Tada.

**Quick Links:**

- 🏗️ [Project Structure](PROJECT_STRUCTURE.md) — Codebase organization
- 🎯 [Design Philosophy](../design/philosophy.md) — Vision and principles
- 📊 [Entry Ontology](../design/ontology.md) — Classification system
- 🗺️ [Roadmap](../design/roadmap.md) — Version planning
- 📝 [Changelog](../CHANGELOG.md) — Release history
- 🤖 [Agent Instructions](../AGENTS.md) — AI-assisted development

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
4. Container setup runs automatically:
   - Dependencies installed via `bun install`
   - CA certificates configured for HTTPS operations
   - Git SSH agent forwarding enabled (VS Code native)
   - GitHub push via HTTPS works automatically (forwarded to SSH)
5. Start development:
   ```bash
   cd app
   bun run dev
   ```

**Git & GitHub in Dev Container**

Git operations (push, pull, clone) work frictionlessly:

- **SSH Agent Forwarding** — VS Code automatically forwards your host's SSH agent to the container, so `git push` to GitHub works without additional setup
- **HTTPS Fallback** — Even HTTPS `git` URLs are automatically redirected to SSH for added reliability
- **CA Certificates** — Both the dev container and production image include CA certificates for HTTPS operations
- **No Manual Config Needed** — Just `git push`, it works

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

## Architecture Overview

Tada uses a **unified Entry model** where everything is an entry:

```
Type (behavior)  →  Category (domain)  →  Subcategory (specific)
    ↓                     ↓                        ↓
  "timed"          "mindfulness"              "sitting"
  "tada"          "accomplishment"              "work"
  "journal"          "journal"                 "dream"
```

- **Types** define behavior (how it's recorded): timed activities, instant captures, journal entries
- **Categories** enable grouping (life domains): mindfulness, movement, creative, learning, journal, accomplishment, events
- **Subcategories** provide specificity: sitting meditation, running, piano practice, dream, work accomplishment

No separate tables for different activity types — just one `entries` table with flexible classification. Add new types/categories/subcategories without schema changes.

**Read more:** [design/ontology.md](../design/ontology.md) and [docs/PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

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

**See [dev/TESTING.md](dev/TESTING.md) for complete testing documentation.**

## Project Structure

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for complete codebase organization.

**Quick reference:**

- `app/pages/` — Vue pages (file-based routing)
- `app/components/` — Reusable Vue components
- `app/server/api/` — REST API endpoints
- `app/server/db/` — Database schema and migrations
- `app/utils/categoryDefaults.ts` — Entry ontology configuration
- `design/` — Design documents (SDR, philosophy, ontology, roadmap)
- `docs/` — Developer documentation

## Architecture Overview

### Tech Stack

- **Framework**: Nuxt 3.15.1 + Vue 3
- **Language**: TypeScript (strict mode enabled)
- **Database**: SQLite via Drizzle ORM
- **Authentication**: Lucia Auth v3
- **PWA**: @vite-pwa/nuxt
- **Styling**: Tailwind CSS
- **Runtime**: Bun 1.3.5 (not Node.js!)

### Unified Entry Model

**Core concept:** Everything is an `Entry` — meditations, dreams, tadas, journal notes, workouts, etc.

```typescript
interface Entry {
  id: string; // nanoid
  userId: string; // FK to users
  type: string; // "timed", "tada", "journal"
  category: string; // "mindfulness", "accomplishment", "journal"
  subcategory: string; // "sitting", "work", "dream"
  emoji: string; // Custom or default emoji
  name: string; // Display name
  timestamp: string; // When it occurred
  durationSeconds: number | null;
  notes: string | null;
  data: object; // Type-specific metadata (JSON)
  tags: string[]; // Searchable tags
}
```

**Key insight:** Rhythms are NOT separate records — they're aggregation queries over entries using matchers.

See [design/ontology.md](../design/ontology.md) for the three-level classification system.

### Database Schema

- **Engine**: SQLite (file-based, perfect for self-hosting)
- **ORM**: Drizzle with full TypeScript types
- **Location**: `app/data/db.sqlite` (auto-created, gitignored)
- **Schema**: `app/server/db/schema.ts`

**Tables:**

- `users` — User accounts (Lucia Auth)
- `sessions` — Authentication sessions
- `entries` — Unified entry model with ontology fields
- `rhythms` — Rhythm definitions and matchers
- `timer_presets` — Saved timer configurations
- `category_settings` — User category customization (v0.2.0)
- `attachments` — Entry attachments (v0.2.0)

**Migrations:** Managed by Drizzle Kit. Always commit generated migration files.

## Development Workflow

### Conventional Commits

We use **conventional commits** for clear, semantic history:

```bash
feat: add emoji picker component
fix: correct timer countdown calculation
docs: update README with ontology section
refactor: extract category logic to utils
test: add unit tests for getEntryDisplayProps
chore: upgrade emoji-picker-element to v1.28
```

**Types:**

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `refactor:` — Code restructure (no behavior change)
- `test:` — Add/update tests
- `chore:` — Maintenance (deps, config, etc.)

### Git Workflow

**Branch Strategy:**

- `main` — Always deployable, protected
- `feature/description` — Human-authored features
- `copilot/description` — AI agent-authored changes

**Pull Request Process:**

1. Create feature branch from `main`
2. Make changes with conventional commits
3. Run `bun run lint:fix` and `bun run typecheck`
4. Push and open PR (CI runs automatically)
5. Get code review (or self-review for small changes)
6. Merge to `main` (squash merge preferred)

### Testing Strategy

**Current State (v0.2.0):**

- ✅ **80 tests** passing
- ✅ **Co-located tests** - next to source files
- ⚠️ **Integration tests** - 4 files disabled (\*.test.ts.skip) pending @nuxt/test-utils rewrite
- ✅ See [app/tests/README.md](../app/tests/README.md) for complete guide

**Test Structure:**

```
app/
├── server/api/
│   ├── entries/
│   │   ├── index.get.ts
│   │   └── index.get.test.ts     # API tests
```

- `sessions` — Lucia auth sessions
- `entries` — Main data table (all activities)
- `rhythms` — Rhythm definitions (query patterns)
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
