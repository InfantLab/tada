# 🎉 Tada

**Track Activities, Discover Achievements** — A personal lifelogger for meditation, habits, dreams, and more.

Tada is an open-source Progressive Web App (PWA) that helps you notice and celebrate your life. Rather than prescribing what you _should_ do, Tada helps you observe what you actually _did_ — like collecting seashells on a beach walk.

## Features

- **🧘 Meditation Timer** — Countdown or unlimited modes with customizable bell sounds
- **📊 Habit Tracking** — Seinfeld method streak tracking with daily/weekly goals
- **🌙 Dream Journal** — Capture and categorize your dreams with rich metadata
- **🎉 Tada List** — Inverted todo list to celebrate accomplishments
- **📱 PWA** — Works offline, installable on any device
- **🔒 Self-Hosted** — Your data stays yours

## Quick Start

### For Users

**Self-Hosted:**

```bash
docker compose up -d
```

Visit `http://localhost:3000` and start logging!

### For Developers

```bash
git clone https://github.com/InfantLab/tada.git
cd tada/app
bun install
bun run dev
```

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for complete development setup.

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

- **Framework**: [Nuxt 3](https://nuxt.com/) + Vue 3 + TypeScript
- **Database**: SQLite via [Drizzle ORM](https://orm.drizzle.team/)
- **PWA**: [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/frameworks/nuxt.html)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Runtime**: Bun

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for architecture details.

## Design Philosophy

> "We don't want to tell people what they should be doing. We want to help them notice what they actually did, and help them feel good about it."

See [design/philosophy.md](design/philosophy.md) for more.

## Data Model

Tada uses a unified `Entry` model for all activity types:

```typescript
interface Entry {
  id: string;
  userId: string;
  type: string; // 'meditation', 'dream', 'tada', 'note', etc.
  occurredAt: Date; // When it happened
  durationSeconds?: number;
  title?: string;
  notes?: string;
  data?: object; // Type-specific metadata
}
```

Habits are defined as aggregation queries over entries, not separate data.

See [design/SDR.md](design/SDR.md) for complete data model specification.

## Contributing

We welcome contributions! Please see [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for:

- Development setup and workflow
- Testing guidelines
- Code style conventions
- Pull request process

Quick checklist:

1. ✅ Follow conventional commit format
2. ✅ Include tests with changes
3. ✅ Update docs if needed
4. ✅ Open issue first for major changes

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

See [design/roadmap.md](design/roadmap.md) for complete roadmap.

## Resources

- **Documentation**: [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)
- **Design Philosophy**: [design/philosophy.md](design/philosophy.md)
- **Technical Decisions**: [design/decisions.md](design/decisions.md)
- **Repository**: https://github.com/InfantLab/tada

## License

[AGPL-3.0](LICENSE) — Free to use, modify, and self-host. Contributions welcome!

---

_Tada is an anagram of "data" — because your life's data belongs to you._ 🎉
