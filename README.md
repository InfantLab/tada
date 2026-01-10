# 🎉 Tada

**Track Activities, Discover Achievements** — A personal lifelogger for mindful living.

Tada is an open-source Progressive Web App (PWA) that helps you notice and celebrate your life. Rather than prescribing what you *should* do, Tada helps you observe what you actually *did*.

> "We don't want to tell people what they should be doing. We want to help them notice what they actually did, and help them feel good about it."

## ✨ Features

- **🧘 Meditation Timer** — Countdown or unlimited modes with customizable bell sounds
- **📊 Habit Tracking** — Seinfeld method streak tracking (no pressure, just noticing)
- **🌙 Dream Journal** — Capture and categorize your dreams with rich metadata
- **🎉 Tada List** — Inverted todo list celebrating what you accomplished
- **📝 Journal** — Simple notes and reflections
- **📱 Works Offline** — Full PWA support, installable on any device
- **🔒 Your Data** — Self-hosted, export anytime, no cloud required

## 🚀 Quick Start

### Try It Out

Visit [tada.example.com](https://tada.example.com) to try the hosted demo, or run it yourself:

```bash
docker run -p 3000:3000 ghcr.io/yourname/tada:latest
# Open http://localhost:3000
```

### Install as PWA

1. Open Tada in your browser
2. Click the "Install" button in the address bar
3. Use it like a native app on desktop or mobile

### Self-Hosting

**Docker (Recommended):**

```bash
docker compose up -d
```

**Manual:**

```bash
# Requires Bun 1.3+
git clone https://github.com/yourname/tada.git
cd tada/app
bun install
bun run build
bun run preview
```

See [docs/deployment.md](docs/deployment.md) for detailed deployment guides (CapRover, Coolify, etc).

## 📖 Usage

### Meditation Timer

1. Open the Timer page
2. Set duration (or choose unlimited)
3. Click Start
4. When finished, the session is automatically logged

### Habit Tracking

1. Define a habit (e.g., "Meditate" = any meditation entry)
2. Your streaks are calculated automatically from your entries
3. No pressure to maintain streaks — just notice what you did

### Dream Journal

1. Wake up, open Tada
2. Quickly jot down what you remember
3. Add tags, lucidity level, or detailed notes later

### Export Your Data

Settings → Export → Download JSON/CSV

Your data is **yours**. Export anytime.

## 🏗️ Architecture

Tada uses a **unified Entry model** — everything (meditation, dreams, todos, notes) is an Entry with a `type` field. Habits are aggregation queries, not separate records.

**Tech Stack:**
- **Nuxt 4** + Vue 3 Composition API
- **SQLite** via Drizzle ORM (PostgreSQL planned for cloud)
- **Tailwind CSS** for styling
- **Lucia Auth** for authentication
- **Bun** runtime (not Node.js!)

See [design/SDR.md](design/SDR.md) for detailed architecture.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Testing guidelines  
- Git workflow
- Architecture patterns
- Agent-assisted development

**Quick Start for Contributors:**

```bash
git clone https://github.com/yourname/tada.git
cd tada/app
bun install
bun run dev
```

## 📋 Roadmap

**Phase 1 (MVP)** - Core functionality: Timer, entries, habits  
**Phase 2** - Polish: Attachments, search, themes  
**Phase 3** - Import: CSV/JSON import from other apps  
**Phase 4** - Advanced: Custom entry types, plugin system  
**Phase 5** - Self-host: Docker, deployment guides  
**Phase 6** - Cloud (Optional): Hosted version with sync  

See [design/roadmap.md](design/roadmap.md) for details.

## 📜 License

AGPL-3.0 — Free and open source. See [LICENSE](LICENSE).

## 💬 Community

- **Issues** - Report bugs or request features
- **Discussions** - Ask questions or share ideas
- **Design Docs** - See `design/` for vision and philosophy

---

Made with ❤️ for mindful living.

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
