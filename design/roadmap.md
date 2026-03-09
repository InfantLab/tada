# Ta-Da! Roadmap

What's coming next. For what already shipped, see [CHANGELOG.md](../CHANGELOG.md) and the release notes.

**Current Version:** v0.4.2 (March 2026) | **Next:** v0.5.0 (Q2 2026)

---

## Version History

| Version    | Theme                       | Status              | Details |
| ---------- | --------------------------- | ------------------- | ------- |
| **v0.1.0** | MVP — Foundation            | ✅ Shipped Jan 2026 | [Release Notes](../RELEASE_NOTES_v0.1.0.md) |
| **v0.2.0** | Graceful Rhythms            | ✅ Shipped Jan 2026 | [Release Notes](../RELEASE_NOTES_v0.2.0.md) |
| **v0.3.0** | Magic & Voice               | ✅ Shipped Jan 2026 | [Release Notes](../RELEASE_NOTES_v0.3.0.md) |
| **v0.3.1** | REST API                    | ✅ Shipped Jan 2026 | [CHANGELOG](../CHANGELOG.md) |
| **v0.4.0** | Ontology & Cloud Service    | ✅ Shipped Feb 2026 | [Release Notes](../RELEASE_NOTES_v0.4.0.md) |
| **v0.4.2** | Backups, Polish & Code Quality | ✅ Shipped Mar 2026 | [Release Notes](../RELEASE_NOTES_v0.4.2.md) |

## Upcoming

| Version    | Theme                       | Target   |
| ---------- | --------------------------- | -------- |
| **v0.5.0** | Modularity                  | Q2 2026  |
| **v0.6.0** | Features & Integrations     | 2027+    |

---

## v0.5.0: Modularity & Sync

_Target: Q2 2026_

**Theme:** Reorganize the codebase into self-contained modules, then build an extensible sync framework on top. Each entry type (tada, tally, timed, moment) becomes a module with its own components, composables, and metadata. Importers, exporters, and **sync providers** become pluggable. New entry types and integrations become addable without touching core code.

**Approach:** Internal module registry (Option B from [modularity.md](modularity.md)) — no external plugin loading, just clean internal boundaries. Full design details in [spec](../specs/006-modularity/spec.md) and [implementation plan](../specs/006-modularity/plan.md).

**Key deliverables — Modularity (done):**
- Module registry with `EntryTypeDefinition`, `DataImporter`, `DataExporter` interfaces
- Core types (tada, tally, timed, moment) extracted into modules as reference implementations
- Generic `/create/[type]` page powered by registry
- Importer/exporter refactor to pluggable interfaces
- Test coverage expansion for services and composables
- Validation with one new entry type built as a pure module

**Key deliverables — Sync API & Provider Framework ([spec](../specs/007-sync-api/spec.md)):**
- `SyncProvider` interface — fourth module type alongside entry types, importers, exporters
- `sync_mappings` table for per-provider external ID tracking (separate from entries)
- Sync engine with pull/push orchestration, last-write-wins conflict resolution
- API extensions: `updated_since` filter, `contentHash` field, `/sync/status`, `/sync/trigger`
- **Obsidian sync provider** — bidirectional sync of entries with Obsidian vault markdown files
- `sync-obsidian` CLI script for cron-based or manual sync

---

## v0.6.0: Features & Integrations

_Target: 2027+_

Everything below benefits from the modular architecture built in v0.5.0 — new features ship as plugins rather than core changes.

### Celestial Calendar (Plugin)

Optional "magic" layer, completely invisible to those who don't want it.

- [ ] Moon phase display and tracking
- [ ] Lunar calendar integration (new moon, full moon, quarters)
- [ ] Celestial data in entry metadata (moon phase when entry was created)
- [ ] Ritual timing suggestions (opt-in)

### Routines & Rituals (Plugin)

- [ ] Morning/evening routine builder
- [ ] Flexible ritual sequences (not rigid schedules)
- [ ] "Ritual mode" — guided flow through routine items
- [ ] Time-of-day awareness (morning routine vs evening wind-down)

### AI Insights (Plugin, with Guardrails)

Private, opt-in AI analysis. All features off by default.

- [ ] Pattern recognition (weekly/monthly rhythms)
- [ ] Gentle observations: "You tend to meditate more on weekends"
- [ ] Correlation hints: "Sleep quality seems better after evening meditation"
- [ ] Identity reinforcement: "You've been consistent as a meditator this month"
- [ ] Granular opt-in per insight type

### Supportive Push Notifications

Gentle, celebratory nudges — never pushy, never guilt-tripping. Off by default.

- [ ] Web Push API integration (PWA)
- [ ] Notification types: milestone celebrations, rhythm encouragement
- [ ] Quiet hours and frequency controls

### Automated Email (opt-in only)

- [ ] Journey milestone: "You've reached Building stage in Meditation!"
- [ ] Anniversary: "You've been with Ta-Da! for 1 year!"
- [ ] Weekly/monthly digest (user must opt in)
- [ ] Set up dedicated support@tada.living email

### External Integrations (Plugins)

Built on the sync provider framework from v0.5.0:

- [x] Obsidian integration (dream journal sync) — shipped in v0.5.0
- [ ] Strava sync provider (one-way ingest of runs/rides)
- [ ] Apple Health / Google Fit (meditation minutes)
- [ ] Day One / journaling app sync
- [ ] IFTTT / Zapier webhooks
- [ ] Calendar integration (schedule ritual times)

### Bug Reporter Enhancements

- [ ] Attach screenshot or screen recording
- [ ] Automatic context (user ID, version, recent actions — with consent)
- [ ] Status tracking UI for submitted reports

### Platform Expansion

- [ ] **Decouple frontend from SSR** — prerequisite for native apps. Rebuild as static SPA talking to REST API. See [decisions.md](decisions.md#native-mobile-not-yet-but-know-the-path) for full analysis.
- [ ] iOS/Android native apps via Capacitor (requires SPA decoupling first)
- [ ] Apple Watch quick entry
- [ ] Home screen widgets (streak, quick capture)

---

## Entry Type Ideas

The unified Entry model supports any `type` value. With the plugin system (v0.5.0), adding new types becomes trivial.

**Current core types:** `timed`, `tada`, `moment`, `tally`, `rhythm`

**Future candidates (as plugins):**

- `sync` — Synchronicity, meaningful coincidence
- `insight` — Sudden understanding, aha moment
- `exercise` — Workout, run, yoga
- `sleep` — Sleep log with quality rating
- `practice` — Music, art, skill practice
- `create` — Made something (art, code, writing)

---

## Ideas Parking Lot

- **Gamification** — Achievements, levels (careful: might conflict with philosophy)
- **Focus mode** — Block distractions during timer
- **Configurable Home Screen** — Widget-based dashboard layout
- **Practice Links** — "Return to this practice" quick-launch, frequency stats
- **Magic Moments** — Pattern view over time, timeline visualization
- **Smarter Conflict Resolution** — Multi-select, category-aware, preview, merge
- **Blog posts** — "The Four Seasons of Practice", "Your Data, Your Practice", "Moments, Not Metrics"

---

## Non-Goals

Things we're explicitly _not_ building:

- **Social network** — This is personal, not social
- **Rhythm prescriptions** — We don't tell you what to do
- **Countdown timers** — We count up, celebrating what you did
- **Streaks as punishment** — Missing a day isn't failure
- **Notifications spam** — Minimal, user-controlled only
- **Monetization dark patterns** — No ads, no selling data
- **Feature bloat** — Simple > comprehensive

---

_Last updated: March 2026_
