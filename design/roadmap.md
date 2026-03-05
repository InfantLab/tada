# Ta-Da! Roadmap

What's coming next. For what already shipped, see [CHANGELOG.md](../CHANGELOG.md) and the release notes.

**Current Version:** v0.4.2 (March 2026)

---

## Version History

| Version    | Theme                       | Status              | Details |
| ---------- | --------------------------- | ------------------- | ------- |
| **v0.1.0** | MVP — Foundation            | ✅ Shipped Jan 2026 | [Release Notes](../RELEASE_NOTES_v0.1.0.md) |
| **v0.2.0** | Graceful Rhythms            | ✅ Shipped Jan 2026 | [Release Notes](../RELEASE_NOTES_v0.2.0.md) |
| **v0.3.0** | Magic & Voice               | ✅ Shipped Jan 2026 | [Release Notes](../RELEASE_NOTES_v0.3.0.md) |
| **v0.3.1** | REST API                    | ✅ Shipped Jan 2026 | [CHANGELOG](../CHANGELOG.md) |
| **v0.4.0** | Ontology & Cloud Service    | ✅ Shipped Feb 2026 | [Release Notes](../RELEASE_NOTES_v0.4.0.md) |
| **v0.4.2** | Backups, Polish & Code Quality | ✅ Shipped Mar 2026 | [CHANGELOG](../CHANGELOG.md) |

## Upcoming

| Version    | Theme                       | Target   |
| ---------- | --------------------------- | -------- |
| **v0.5.0** | Modularity                  | Q2 2026  |
| **v0.6.0** | Features & Integrations     | 2027+    |

---

## v0.4.2: Backups, Polish & Code Quality

_Shipped: March 2026_

**Theme:** Database safety, small UX fixes, voice polish.

### Database & Operations

- [x] Automated backup scripts for CapRover (scheduled + on-demand)
- [x] Live-import script: pull/push via `docker cp` (container-aware)
- [x] Health endpoint: `db.execute` → `db.run` fix

### UX Fixes

- [x] Ta-da save: navigate to timeline after celebration (was staying on entry screen)
- [x] Rhythm chain cache: invalidate on historical entry inserts (was only checking latest timestamp)
- [x] Rhythm gap discovery: tappable heatmap cells + gap hint text
- [x] Rhythm heatmap popover: show entry list with links on active days, smart add-entry with correct type & date
- [x] Clarify BYOK settings UI — unclear what keys are needed and where to get them
- [x] Timeline search: free-text date parsing ("march 2024", "march 4, 2024", "yesterday")

### Code Quality

- [x] Fix 220 pre-existing TypeScript strict mode errors across 51 files (see recommendation below)
- [x] Fix 74 ESLint errors (36 `no-explicit-any`, 28 `no-unused-vars`, misc)
- [x] Fix 18 TypeScript errors in v1 API test files (rhythms, webhooks, insights)

### Voice

- [x] Improve LLM extraction accuracy (smarter parsing of ambiguous input)
- [x] Voice entries should set `category: "moments"` for moment subtypes

---

## v0.5.0: Modularity

_Target: Q2 2026_

**Theme:** Make the architecture modular before adding more features. New entry types, importers, exporters, and views should be addable without touching core code. See [modularity.md](modularity.md) for the full design and trade-offs, and [SDR.md Section 5](SDR.md#5-plugin-architecture) for the original plugin interface spec.

### Why Now

The codebase has grown through four releases. Before adding celestial calendars, AI insights, routines, or integrations, we need clean extension points. Otherwise every new feature tangles deeper into the core. Modularity pays for itself by making everything after it cheaper to build and maintain.

### Plugin System Foundation

Implement the `TadaPlugin` interface from the SDR:

- [ ] Plugin loader: discover and register plugins from `/plugins` directory
- [ ] Plugin lifecycle: `onLoad()` / `onUnload()` hooks
- [ ] `registerEntryTypes()` — define new entry types with data schemas
- [ ] `registerImporters()` — pluggable data import (CSV recipes become plugins)
- [ ] `registerExporters()` — pluggable export (JSON, CSV, Markdown, Obsidian)
- [ ] `registerViews()` — custom UI pages registered by plugins
- [ ] Plugin settings UI — per-plugin configuration in Settings page

### Entry Type Modularity

The unified Entry model already supports open string types. Finish the job:

- [ ] Entry type registry: central place that defines available types and their UI
- [ ] Type-specific input components (currently hardcoded per page)
- [ ] Type-specific display components (currently hardcoded in timeline)
- [ ] Move core types (timed, tada, moment, tally) into built-in plugins as reference implementations

### Importer / Exporter Refactor

- [ ] Refactor CSV import wizard to use plugin importer interface
- [ ] Move Insight Timer recipe to a built-in import plugin
- [ ] Refactor JSON/CSV/Markdown export to use plugin exporter interface
- [ ] Obsidian export as a built-in export plugin

### Test Coverage Expansion

Current coverage: **14.1%** (35 of 249 source files). Utils are well-tested (79%), but critical layers are not:

| Layer | Files | Tested | Coverage |
|-------|-------|--------|----------|
| Utils | 14 | 11 | 79% |
| Composables | 18 | 3 | 17% |
| Server Utils | 17 | 3 | 18% |
| Server Services | 10 | 1 | 10% |
| API Routes | 94 | 4 | 4% |
| Components | 61 | 0 | 0% |
| Pages | 28 | 0 | 0% |

Priority targets: `server/services/entries.ts`, `server/utils/permissions.ts`, `server/utils/auth.ts`, `composables/useEntryEngine.ts`

### Carried Forward (from earlier versions)

Items that fit naturally into this release:

- [ ] Rewrite integration tests with @nuxt/test-utils/e2e
- [ ] Expand server service and API route test coverage (see table above)
- [ ] Timer-specific onboarding: "Keep this tab in the foreground" (first timer start)
- [ ] New feature callouts for returning users (subtle badge/dot, not modal)

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

- [ ] Obsidian integration (dream journal sync)
- [ ] Apple Health / Google Fit (meditation minutes)
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
