# Contributing to Tada

Thank you for your interest in contributing to Tada! This guide will help you get started with development, testing, and submitting changes.

## Development Setup

### Prerequisites

- **Bun** (not Node.js!) - [Install Bun](https://bun.sh)
- **Git** - For version control
- **VS Code** (recommended) - With Dev Containers extension

### Clone and Install

```bash
git clone https://github.com/yourname/tada.git
cd tada

# Using Dev Container (recommended)
# Open in VS Code and select "Reopen in Container"

# Or install dependencies directly
cd app
bun install
```

### Development Commands

```bash
# Development
cd app
bun run dev           # Start Nuxt dev server on :3000

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

# Testing
bun run test          # Run tests
bun run test:ui       # Visual test UI
bun run test:coverage # Coverage report
```

## Git Workflow

### Branch Naming

- Manual work: `feature/brief-description` or `fix/brief-description`
- Agent work: Automatically created as `copilot/brief-description` by GitHub Copilot

### Commit Messages

We use **conventional commits** for clear history:

```bash
feat: add entry CRUD API endpoints
fix: correct timer countdown calculation  
test: add unit tests for streak calculation
docs: update README with deployment guide
refactor: extract timer logic to composable
chore: upgrade Nuxt to 4.2
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `chore`: Dependency updates, tooling

### Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make Changes**
   - Write tests first (TDD preferred)
   - Keep changes focused and atomic
   - Update documentation as needed

3. **Verify Quality**
   ```bash
   bun run lint          # Must pass
   bun run typecheck     # Must pass
   bun run test          # Must pass
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature
   ```
   - Fill out the PR template
   - Link related issues
   - Request review

5. **CI Must Pass**
   - GitHub Actions runs lint, typecheck, test, and build
   - At least one review required for `main`
   - Squash merge to keep history clean

## Testing Philosophy

### Coverage Targets
- **80%+ unit test coverage** for new code
- **Critical paths** must have integration tests
- **Key user flows** should have E2E tests

### Test Structure

```
app/
├── server/
│   └── api/
│       ├── entries.get.ts
│       └── entries.get.test.ts     # Co-located unit tests
├── composables/
│   ├── useTimer.ts
│   └── useTimer.test.ts
└── tests/
    └── e2e/
        └── timer-flow.spec.ts      # E2E tests
```

### Writing Tests

**Unit Test Example:**
```typescript
// app/server/api/entries.get.test.ts
import { describe, it, expect } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

describe('GET /api/entries', () => {
  it('returns entries for authenticated user', async () => {
    const { data } = await $fetch('/api/entries')
    expect(data).toHaveLength(3)
  })
})
```

**Integration Test Example:**
```typescript
// app/composables/useTimer.test.ts
import { describe, it, expect } from 'vitest'
import { useTimer } from './useTimer'

describe('useTimer', () => {
  it('counts down from duration', async () => {
    const { start, remaining } = useTimer(60)
    start()
    await new Promise(r => setTimeout(r, 1000))
    expect(remaining.value).toBeLessThan(60)
  })
})
```

## Agent-Assisted Development

Tada embraces modern agent-first patterns while remaining accessible to traditional development:

### Using GitHub Issues with @copilot

1. **Create an Issue** with clear acceptance criteria:
   ```markdown
   Title: Implement Entry CRUD API
   
   Acceptance Criteria:
   - [ ] GET /api/entries - List entries with filtering
   - [ ] GET /api/entries/:id - Get single entry
   - [ ] POST /api/entries - Create entry
   - [ ] PUT /api/entries/:id - Update entry
   - [ ] DELETE /api/entries/:id - Delete entry
   - [ ] Integration tests with 80%+ coverage
   ```

2. **Assign to @copilot** or invoke custom agents:
   - `@plan` - Generates implementation plans
   - `@implementation` - Writes production code
   - `@test-writer` - Writes comprehensive tests

3. **Review and Merge** the generated PR

### Custom Agents

See `.github/agents/` for specialized agent profiles:
- `plan.agent.md` - Planning and research
- `implementation.agent.md` - Code implementation
- `test-writer.agent.md` - Test writing

### AGENTS.md

The `AGENTS.md` file at the repository root contains comprehensive instructions specifically for AI coding agents. If you're working with agents, start there.

## Architecture Guidelines

### Unified Entry Model

Everything is an `Entry` — meditation sessions, dreams, todos, journal notes. The `type` field distinguishes them:

```typescript
const entry = {
  type: 'meditation',
  occurredAt: new Date(),
  durationSeconds: 600,
  data: {
    technique: 'vipassana',
    bellSound: 'singing-bowl'
  }
}
```

Habits are **not separate records** — they're aggregation queries using matchers.

### Offline-First Architecture

- **PWA with Service Worker** - Works without internet
- **Local SQLite** - All data stored client-side
- **Optional Sync** - Future feature for multi-device
- **Export Always Available** - Data ownership paramount

### Plugin-Based Features

Keep the core minimal. New features should be plugins:

```typescript
// app/plugins/feature.ts
export default defineNuxtPlugin((nuxtApp) => {
  // Plugin logic
})
```

### Composables for Logic

Extract reusable logic into composables:

```typescript
// app/composables/useEntries.ts
export const useEntries = () => {
  const { data, refresh } = useAsyncData('entries', () => 
    $fetch('/api/entries')
  )
  
  const createEntry = async (entry) => {
    await $fetch('/api/entries', { method: 'POST', body: entry })
    await refresh()
  }
  
  return { entries: data, createEntry, refresh }
}
```

## Code Style

### TypeScript

- **Strict mode enabled** - No implicit `any`
- **Type everything** - Explicit types preferred
- **Interfaces over types** - Unless you need unions/intersections

### Vue Components

- **Composition API** - `<script setup>` syntax
- **Single-file components** - One component per file
- **Props with TypeScript** - Use `defineProps<{ ... }>()`

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  update: [value: number]
}>()
</script>

<template>
  <div>{{ title }}: {{ count ?? 0 }}</div>
</template>
```

### Naming Conventions

- **Components**: PascalCase (`EntryCard.vue`)
- **Composables**: camelCase with `use` prefix (`useTimer.ts`)
- **Files**: kebab-case or PascalCase (match content)
- **Database**: snake_case (`occurred_at`)

## Database Migrations

When modifying the schema:

```bash
# 1. Edit app/server/db/schema.ts
# 2. Generate migration
cd app
bun run db:generate

# 3. Review migration in drizzle/migrations/
# 4. Apply migration
bun run db:migrate

# 5. Commit BOTH schema.ts and migration files
git add server/db/schema.ts drizzle/
git commit -m "feat(db): add tags column to entries"
```

## CI/CD

### GitHub Actions

Our CI pipeline (`.github/workflows/ci.yml`) runs on every push and PR:

1. **Lint & Test Job** - Runs lint, typecheck, tests, uploads coverage
2. **Build Job** - Builds Nuxt app, uploads artifacts
3. **Docker Job** - Builds and tests Docker image (main branch only)

All three must pass for PR to be mergeable.

### Pre-Push Checklist

Before pushing, verify locally:

```bash
cd app
bun run lint          # ✓ No linting errors
bun run typecheck     # ✓ No TypeScript errors  
bun run test          # ✓ All tests pass
bun run build         # ✓ Production build succeeds
```

## Design Documents

Before implementing major features, review these documents in `design/`:

- **SDR.md** - Software Design Requirements (THE source of truth)
- **philosophy.md** - Vision, tone, what we're NOT building
- **decisions.md** - Technical decisions with rationale
- **roadmap.md** - Feature phases and priorities

## Common Tasks

### Adding an API Endpoint

```typescript
// app/server/api/entries.get.ts
import { db } from '../db'
import { entries } from '../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id // Lucia auth
  if (!userId) {
    throw createError({ statusCode: 401 })
  }
  
  const userEntries = await db
    .select()
    .from(entries)
    .where(eq(entries.userId, userId))
  
  return { data: userEntries }
})
```

### Adding a Page

```vue
<!-- app/pages/my-page.vue -->
<script setup lang="ts">
useSeoMeta({
  title: 'My Page - Tada',
  description: 'Page description'
})

const { entries } = useEntries()
</script>

<template>
  <div>
    <h1>My Page</h1>
    <!-- Content -->
  </div>
</template>
```

Route will automatically be available at `/my-page`.

### Modifying Database Schema

```typescript
// app/server/db/schema.ts
export const entries = sqliteTable('entries', {
  // Existing fields...
  tags: text('tags', { mode: 'json' }).$type<string[]>(), // NEW
})
```

Then run `bun run db:generate` and `bun run db:migrate`.

## Troubleshooting

**"Module not found" errors:**
```bash
cd app && bun install  # Refresh dependencies
```

**Port 3000 already in use:**
```bash
pkill -f 'bun.*dev'    # Kill existing process
# Or use different port
PORT=3001 bun run dev
```

**Database errors:**
```bash
# In dev only - delete and recreate
rm -rf app/data/db.sqlite*
cd app && bun run db:migrate
```

**Type errors:**
```bash
bun run typecheck      # See all errors
# Strict mode is enabled - fix all implicit any
```

## Getting Help

- **Issues** - Report bugs or request features
- **Discussions** - Ask questions or share ideas
- **Design Docs** - See `design/` for architecture guidance
- **AGENTS.md** - If working with AI agents

## License

AGPL-3.0 - See [LICENSE](LICENSE) for details.

---

**Thank you for contributing to Tada!** 🎉
