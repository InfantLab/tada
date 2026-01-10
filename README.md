# 🎉 Tada

**Track Activities, Discover Achievements** — A personal lifelogger for meditation, habits, dreams, and more.

Tada is an open-source Progressive Web App (PWA) that helps you notice and celebrate your life. Rather than prescribing what you *should* do, Tada helps you observe what you actually *did* — like collecting seashells on a beach walk.

## Features

- **🧘 Meditation Timer** — Countdown or unlimited modes with customizable bell sounds
- **📊 Habit Tracking** — Seinfeld method streak tracking with daily/weekly goals  
- **🌙 Dream Journal** — Capture and categorize your dreams with rich metadata
- **🎉 Tada List** — Inverted todo list to celebrate accomplishments
- **📱 PWA** — Works offline, installable on any device
- **🔒 Self-Hosted** — Your data stays yours

## Quick Start

### Development

```bash
# Clone the repository
git clone https://github.com/your-username/tada.git
cd tada

# Install Bun (if not already installed)
# See https://bun.sh for installation instructions

# Install dependencies
cd app
bun install

# Start development server
bun run dev
```

### Using Dev Container (Recommended)

1. Open in VS Code
2. Install the "Dev Containers" extension
3. Click "Reopen in Container" when prompted
4. Run `cd app && bun install && bun run dev`

### Docker

```bash
# Build and run
docker compose up -d

# Development mode with hot reload
docker compose --profile dev up tada-dev
```

## Project Structure

```
tada/
├── app/                  # Nuxt 3 application
│   ├── pages/            # Vue pages (Timeline, Timer, Habits, Journal)
│   ├── layouts/          # App layouts
│   ├── server/           # API routes and database
│   │   ├── api/          # REST endpoints
│   │   └── db/           # Drizzle ORM schema
│   └── public/           # Static assets (icons, bell sounds)
├── design/               # Design documents
│   ├── SDR.md            # Software Design Requirements
│   ├── philosophy.md     # Vision and tone
│   ├── decisions.md      # Technical decisions
│   └── alternatives.md   # Competitive analysis
├── old_data/             # Sample import data
├── Dockerfile            # Production container
└── docker-compose.yml    # Container orchestration
```

## Tech Stack

- **Framework**: [Nuxt 3](https://nuxt.com/) + Vue 3
- **Database**: SQLite via [Drizzle ORM](https://orm.drizzle.team/)
- **PWA**: [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/frameworks/nuxt.html)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Auth**: [Lucia](https://lucia-auth.com/)

## Design Philosophy

> "We don't want to tell people what they should be doing. We want to help them notice what they actually did, and help them feel good about it."

See [design/philosophy.md](design/philosophy.md) for more.

## Data Model

Tada uses a unified `Entry` model for all activity types:

```typescript
interface Entry {
  id: string
  userId: string
  type: string           // 'meditation', 'dream', 'tada', 'note', etc.
  occurredAt: Date       // When it happened
  durationSeconds?: number
  title?: string
  notes?: string
  data?: object          // Type-specific metadata
}
```

Habits are defined as aggregation queries over entries, not separate data.

## Development Workflow

### For Human Developers

Tada uses a **modern agent-first development approach** while remaining fully accessible to traditional development workflows. Here's what that means in practice:

#### Getting Started

1. **Clone and Setup**
   ```bash
   git clone https://github.com/yourname/tada.git
   cd tada
   
   # Using Dev Container (recommended)
   # Open in VS Code and select "Reopen in Container"
   
   # Or install dependencies directly
   cd app && bun install
   ```

2. **Run Tests**
   ```bash
   cd app
   bun run test          # Run all tests
   bun run test:ui       # Run with visual UI
   bun run test:coverage # Generate coverage report
   ```

3. **Start Development**
   ```bash
   bun run dev           # Start dev server on :3000
   bun run lint          # Check code style
   bun run typecheck     # Verify TypeScript
   ```

#### Git Workflow

We use **conventional commits** for clear history:

```bash
feat: add entry CRUD API endpoints
fix: correct timer countdown calculation  
test: add unit tests for streak calculation
docs: update README with testing guide
refactor: extract timer logic to composable
```

**Branch Strategy:**
- `main` — Always deployable, protected
- `feature/description` — Human-authored features
- `copilot/description` — AI agent-authored changes (auto-created)

**Pull Request Process:**
1. Create feature branch from `main`
2. Make your changes with tests
3. Push and open PR (CI runs automatically)
4. Get review and merge to `main`

#### Agent-Assisted Development

This project leverages GitHub Copilot agents to accelerate development. You can:

**Use AI Agents in VS Code:**
- Chat with `@workspace` to ask codebase questions
- Use `/plan` to generate implementation plans
- Use `/test` to generate test cases
- Reference `#codebase` for workspace-wide searches

**Assign Issues to Agents:**
1. Create GitHub Issue with detailed acceptance criteria
2. Assign to `@copilot` (on GitHub.com)
3. Agent will autonomously create PR
4. Review, iterate via PR comments, merge when ready

**Custom Agent Workflows:**
- `@plan` — Generates implementation plans (read-only, no code changes)
- `@implementation` — Implements features from plans
- `@test-writer` — Writes comprehensive test coverage

See [AGENTS.md](AGENTS.md) for agent-specific instructions.

#### Testing Philosophy

**Test-Driven Development (TDD):**
- Write tests first when possible
- Co-locate tests with implementation (`*.test.ts` next to `*.ts`)
- Aim for 80%+ unit test coverage
- Critical paths need E2E tests

**Test Structure:**
```
app/
├── server/api/
│   ├── entries.get.ts
│   └── entries.get.test.ts       ← API tests
├── composables/
│   ├── useTimer.ts
│   └── useTimer.test.ts          ← Logic tests
└── tests/e2e/
    └── timer-flow.spec.ts        ← User flow tests
```

#### Architecture Guidelines

**Unified Entry Model:**
- All activities (meditation, dreams, todos) are `Entry` records
- Type-specific data lives in `data` JSONB field
- Habits are aggregation queries, not separate records

**Offline-First:**
- PWA with service worker
- IndexedDB for local storage
- Background sync when online
- Works completely offline

**Plugin Architecture:**
- Core stays minimal (entries, timeline, timer)
- Everything else is a plugin (books, films, fitness)
- Plugins can define new entry types

#### Code Style

- TypeScript strict mode (required)
- ESLint + Prettier (auto-format on save)
- Vue 3 Composition API with `<script setup>`
- Tailwind for styling (no custom CSS unless necessary)

#### Database Migrations

```bash
cd app

# Generate migration from schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# Open Drizzle Studio to view data
bun run db:studio
```

#### CI/CD

Every push to `main` or PR triggers:
- ✓ ESLint checks
- ✓ TypeScript compilation
- ✓ Unit tests with coverage
- ✓ Build verification

Merges to `main` trigger:
- ✓ Docker image build
- ✓ Push to GitHub Container Registry

## Roadmap

See [design/roadmap.md](design/roadmap.md) for detailed phases.

**Phase 1 (MVP):**
- [x] Project scaffolding
- [x] Database schema
- [x] PWA configuration
- [ ] Entry CRUD API
- [ ] Timeline view
- [ ] Meditation timer with bells
- [ ] Basic authentication

**Phase 2:**
- [ ] Habit tracking with streaks
- [ ] Data export (JSON/CSV)
- [ ] Calendar heatmap

**Phase 3:**
- [ ] Import plugins (Insight Timer, Strava)
- [ ] Voice input with LLM
- [ ] Dream journal enhancements

## Contributing

Contributions welcome! Please:
1. Check existing issues or create one
2. Follow the conventional commit format
3. Include tests with your changes
4. Update docs if needed

For major changes, discuss in an issue first.

## License

[AGPL-3.0](LICENSE) — Free to use, modify, and self-host. Contributions welcome!

---

*Tada is an anagram of "data" — because your life's data belongs to you.* 🎉
