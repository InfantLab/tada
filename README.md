<p align="center">
  <img src="[https://raw.githubusercontent.com/InfantLab/tada/main/app/public/icons/Ta-Da!-logotype.png](https://github.com/InfantLab/tada/blob/main/app/public/icons/tada-logotype.png)" alt="TA-DA" width="300" />
</p>

# ⚡ Ta-da!

**Track Activities, Discover Achievements** — A personal lifelogger for meditation, habits, dreams, and accomplishments.

Ta-Da! is an open-source Progressive Web App (PWA) that helps you notice and celebrate your life. Rather than prescribing what you _should_ do, Ta-Da! helps you observe what you actually _did_ — swapping the anxiety-inducing todo list into a celebration of accomplishment.

> _"We don't want to tell people what they should be doing. We want to help them notice what they actually did, and help them feel good about it."_

## Philosophy

Ta-Da! inverts the traditional productivity mindset:

- **Noticing, not tracking** — Observe your life without judgment
- **Celebration, not obligation** — Turn todos into "Ta-Da!"s
- **Data ownership** — Your life data belongs to you, always exportable
- **Offline-first** — Works without internet, syncs when convenient
- **Simple by design** — Feature-complete, not feature-bloated

Read more: [design/philosophy.md](design/philosophy.md)

## Features (v0.1.0)

- **🧘 Meditation Timer** — Countdown or unlimited modes with customizable bell sounds, wake lock support
- **⚡ Ta-Da! Accomplishments** — Quick capture of wins with category and emoji
- **🌙 Dream Journal** — Rich dream entries with mood and themes
- **📝 Quick Notes** — Capture thoughts, gratitude, reflections
- **📊 Entry Timeline** — Chronological feed with emoji badges and category colors
- **🎨 Emoji Customization** — Full system emoji picker for any entry
- **📱 PWA** — Installable, works offline
- **🔒 Self-Hosted** — Your data stays yours, full JSON export

## Tech Stack

- **Framework:** [Nuxt 3.15.1](https://nuxt.com/) + Vue 3 + TypeScript
- **Database:** SQLite via [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication:** [Lucia Auth v3](https://lucia-auth.com/)
- **PWA:** [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/frameworks/nuxt.html)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Runtime:** [Bun 1.3.5](https://bun.sh/)
- **Container:** Docker with Alpine Linux

**Why these choices?** See [design/decisions.md](design/decisions.md)

## Quick Start

### For Users

**Docker (Recommended):**

```bash
docker compose up -d
```

Visit `http://localhost:3000`, create an account, and start logging!

**Data Location:** `./app/data/db.sqlite` (mount as volume for persistence)

### For Developers

```bash
git clone https://github.com/InfantLab/Ta-Da!.git
cd Ta-Da!/app
bun install
bun run dev
```

Development server runs on `http://localhost:3000` with hot reload.

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for complete setup and [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for architecture overview.

## Entry Ontology

Ta-Da! uses a flexible three-level classification system for all life activities:

```
Type (behavior)  →  Category (domain)  →  Subcategory (specific)
    ↓                     ↓                        ↓
  "timed"          "mindfulness"              "sitting"
  "Ta-Da!"          "accomplishment"              "work"
  "journal"          "journal"                 "dream"
```

Every entry can have a custom emoji, with sensible defaults based on category and subcategory. Seven built-in categories cover most life activities: mindfulness, movement, creative, learning, journal, accomplishment, and events.

**Key principle:** Types define behavior (how it's recorded), categories enable grouping (life domains), subcategories provide specificity. All are open strings — add your own without touching code.

Read more: [design/ontology.md](design/ontology.md)

## Architecture

Ta-Da! uses a **unified Entry model** where everything is an entry. No separate tables for meditations, dreams, Ta-Da!s — just one flexible `entries` table with type, category, and subcategory fields. Habits are aggregation queries over entries, not separate data.

**Why?** Simplicity. One data model, one API, infinite flexibility. Add new activity types without schema migrations. Your life is different from mine.

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for detailed project layout and [design/SDR.md](design/SDR.md) for complete data model specification.

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for detailed project layout and [design/SDR.md](design/SDR.md) for complete data model specification.

## Development

**Commands:**

```bash
bun run dev          # Start dev server (:3000)
bun run lint:fix     # Auto-fix code style
bun run typecheck    # Type check
bun run db:generate  # Generate migrations
bun run db:migrate   # Apply migrations
bun run db:studio    # Database UI (:4983)
```

**CI/CD:**

- ✅ ESLint + TypeScript checks on every push
- ✅ Automated tests (when written)
- ✅ Docker image build and push to GHCR on merge to `main`

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for full development workflow.

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for full development workflow.

## Roadmap

**Current:** v0.1.0 (MVP) ✅ — Feature complete!

**Next:** v0.2.0 (Q1 2026) — Habit tracking, category customization, data import

**Future:** v0.3.0+ — Voice input, Obsidian sync, advanced visualizations

See [design/roadmap.md](design/roadmap.md) and [CHANGELOG.md](CHANGELOG.md) for details.

## Resources

- **📖 Documentation:** [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)
- **🏗️ Architecture:** [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)
- **🎯 Design Philosophy:** [design/philosophy.md](design/philosophy.md)
- **🎨 Visual Design:** [design/visual design.md](design/visual%20design.md)
- **📊 Entry Ontology:** [design/ontology.md](design/ontology.md)
- **🗺️ Roadmap:** [design/roadmap.md](design/roadmap.md)
- **🤖 AI Agent Guide:** [AGENTS.md](AGENTS.md)
- **📝 Changelog:** [CHANGELOG.md](CHANGELOG.md)
- **📦 Repository:** https://github.com/InfantLab/Ta-Da!

## Contributing

We welcome contributions! Quick checklist:

1. ✅ Read [design/philosophy.md](design/philosophy.md) — Understand the "why"
2. ✅ Check [design/roadmap.md](design/roadmap.md) — See what's planned
3. ✅ Follow conventional commits — `feat:`, `fix:`, `docs:`, etc.
4. ✅ Update docs if changing behavior
5. ✅ Open an issue first for major changes

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for detailed contribution guidelines.

## License

[AGPL-3.0](LICENSE) — Free to use, modify, and self-host. Contributions welcome!

---

_Ta-Da! is an anagram of "data" — your life's data belongs to you._ ⚡

