# Contributing to Ta-Da!

Thanks for your interest in contributing to Ta-Da! This guide covers what you need to get started.

## Prerequisites

- **Bun** v1.3+ ([install](https://bun.sh)) -- used as package manager and runtime
- **Git**
- **VS Code** with Dev Containers extension (recommended, not required)

## Getting Started

```bash
git clone https://github.com/InfantLab/tada.git
cd tada/app
bun install
bun run dev
```

The app runs at `http://localhost:3000`.

Alternatively, open the repo in VS Code and use the Dev Container (recommended) -- it handles all setup automatically. See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for Docker and other setup options.

## Project Structure

```
tada/
├── app/                  # Nuxt 3 application
│   ├── pages/            # File-based routing (Vue components)
│   ├── components/       # Reusable Vue components
│   ├── composables/      # Shared logic (useTimer, useVoiceCapture, etc.)
│   ├── server/api/       # REST API endpoints (Nitro)
│   ├── server/db/        # Drizzle ORM schema & migrations
│   └── utils/            # Client utilities
├── design/               # Design documents (SDR, philosophy, ontology)
├── docs/                 # Developer & deployment documentation
└── specs/                # Feature specifications
```

For full details see [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

## Development Workflow

1. **Check existing issues** or create one to discuss your change
2. **Create a branch** from `main`:
   - `feature/description` for human-authored work
   - `copilot/description` for AI-assisted changes
3. **Make your changes** with tests
4. **Run checks** before committing:
   ```bash
   cd app
   bun run lint:fix
   bun run typecheck
   bun run test --run
   ```
5. **Push and open a PR** -- CI runs lint, typecheck, tests, and build automatically
6. **Get a review** and merge (squash merge preferred)

## Code Style

The project uses ESLint (configured in the repo) and TypeScript strict mode. Key conventions:

- **Double quotes**, semicolons required
- **Never use `any`** -- use `unknown` with type guards
- **Vue 3 Composition API** with `<script setup>` syntax
- **Tailwind CSS** for styling
- **File naming**: pages in `kebab-case.vue`, components in `PascalCase.vue`, composables as `useFeatureName.ts`
- **Typed `$fetch`**: always use `$fetch<Type>("/api/...")` to avoid CI failures
- **Logging**: use `createLogger()`, not `console.log`

Run `bun run lint:fix` to auto-fix most style issues.

## Testing

Tests use [Vitest](https://vitest.dev/) and are co-located with source files (`*.test.ts`).

```bash
cd app
bun run test --run        # Run all tests (non-interactive)
bun run test:ui           # Visual test UI
bun run test:coverage     # Coverage report
```

Guidelines:
- Co-locate tests next to the code they test
- Aim for 80%+ coverage on new code
- Test behavior, not implementation details

See [app/tests/README.md](app/tests/README.md) for examples and patterns.

## Commit Messages

Use **conventional commits**:

```
feat: add emoji picker component
fix: correct timer countdown calculation
docs: update deployment guide
refactor: extract category logic to utils
test: add unit tests for streak calculation
chore: upgrade Nuxt to 3.21
```

Prefix types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

## Database Changes

If you modify `app/server/db/schema.ts`:

```bash
cd app
bun run db:generate   # Generate migration SQL
bun run db:migrate    # Apply migration locally
```

Always commit both the schema change and the generated migration files.

## Pull Request Checklist

- [ ] Lint passes (`bun run lint`)
- [ ] TypeScript compiles (`bun run typecheck`)
- [ ] Tests pass (`bun run test --run`)
- [ ] New code has tests
- [ ] Docs updated if behavior changed
- [ ] One feature or fix per PR

## Further Reading

- [Developer Guide](docs/DEVELOPER_GUIDE.md) -- full setup, architecture, and common tasks
- [Design Philosophy](design/philosophy.md) -- vision and principles
- [Entry Ontology](design/ontology.md) -- the unified Entry model
- [Agent Instructions](AGENTS.md) -- AI-assisted development conventions

---

Questions? Open an issue on [GitHub](https://github.com/InfantLab/tada).
