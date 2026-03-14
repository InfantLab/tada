# Ta-Da! Roadmap

What's coming next. For what already shipped, see [CHANGELOG.md](../CHANGELOG.md) and the release notes.

**Current Version:** v0.5.0 (March 2026) | **Next:** v0.6.0 (2027+)

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
| **v0.5.0** | Housekeeping & Infrastructure | ✅ Shipped Mar 2026 | [Release Notes](../RELEASE_NOTES_v0.5.0.md) |

## Upcoming

| Version    | Theme                       | Target   |
| ---------- | --------------------------- | -------- |
| **v0.6.0** | Features & Integrations     | 2027+    |

---

## v0.5.0: Housekeeping & Infrastructure ✅

_Shipped: March 2026_

**Theme:** Comprehensive housekeeping release — security audit and hardening, dependency modernization, test coverage expansion, and infrastructure improvements. No new user-facing features; instead, 32 of 33 audit items completed across security, dependencies, testing, documentation, and code quality.

**Key deliverables — Security:**
- Lucia auth migration to direct session management
- Session cookie hardening (sameSite, httpOnly, secure)
- Security headers middleware (CSP, HSTS, X-Frame-Options, etc.)
- SSRF protection, error sanitization, password policy, CSV limits
- Persistent SQLite-backed rate limiting

**Key deliverables — Dependencies:**
- Nuxt 3 → 4.4.2, Stripe 17 → 20, TypeScript 5.7 → 5.9, Zod 3 → 4
- @libsql/client updated, @nuxt/devtools removed (bundled in Nuxt 4)

**Key deliverables — Testing (209 new tests):**
- Auth endpoints (38), entry CRUD (33), admin API (26), sync engine (25)
- Billing/Stripe (40), component tests (47), Playwright E2E (4)

**Key deliverables — Documentation & Quality:**
- Admin API documented in API-SPECIFICATION.md
- CONTRIBUTING.md created, version references updated, specs marked complete
- Structured logging with request IDs, console.log cleanup

---

## v0.6.0: Features & Integrations

_Target: 2027+_

Everything below benefits from the modular architecture and hardened infrastructure from v0.5.0.

### Deferred from v0.5.0

- [ ] **Tailwind v4 upgrade** — deferred, @nuxtjs/tailwindcss module not yet compatible with v4

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
