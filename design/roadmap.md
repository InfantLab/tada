# Ta-Da! Roadmap

What's coming next. For what already shipped, see [CHANGELOG.md](../CHANGELOG.md) and the release notes.

**Current Version:** v0.6.1 (March 2026) | **Next:** v0.7.0

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
| **v0.6.0** | Weekly Rhythms, Daily Timelines & Polish | ✅ Shipped Mar 2026 | [Release Notes](../RELEASE_NOTES_v0.6.0.md) |
| **v0.6.1** | PWA, Push & Accessibility    | ✅ Shipped Mar 2026 | [Release Notes](../RELEASE_NOTES_v0.6.1.md) |

## Upcoming

| Version    | Theme                       | Target   |
| ---------- | --------------------------- | -------- |
| **v0.7.0** | Features & Integrations     | 2026+    |

---

## v0.6.1: PWA, Push Notifications & Accessibility ✅

_Shipped: March 2026_

**Theme:** Progressive web app polish, web push notifications for weekly rhythms, and a comprehensive WCAG 2.2 AA accessibility audit (Phases 1+2 implemented, Phase 3 documented for future sprint).

**Key deliverables — PWA & Push:**
- Maskable icon, app identity pinning, app shortcuts, offline fallback page
- Screen wake lock during voice recording
- Web push notifications for Monday celebrations and Thursday encouragements (VAPID-based, opt-in)

**Key deliverables — Accessibility (Phase 1+2):**
- Skip-to-content link, dialog roles on all modals, form label wiring, aria-pressed/aria-checked semantics
- Focus management: modals capture focus on open, restore on close
- Colour contrast fixes: text-tada-600→700, stone-400→500, hardcoded chart colours
- Chart button touch targets enlarged, keyboard-accessible rhythm panels
- Handover doc at `design/accessibility.md` for Phase 3 (focus traps, colourblind heatmaps, reduced motion, etc.)

**Bug fixes:**
- Registration error messages now surface correctly (#10) — 3-char username minimum enforced
- Android PWA mic noise fixed (#5)
- Version number legibility on Help, Settings, About pages
- What's New overlay navigates to rhythms section of settings

---

## v0.6.0: Weekly Rhythms, Daily Timelines & Polish ✅

_Shipped: March 2026_

**Theme:** Weekly review features, daily timeline visualisation, and UX polish. Users can opt in to a Thursday mid-week encouragement nudge and a Monday morning celebration summary with four privacy tiers. Colourful daily timeline bars show how each day unfolded at a glance.

**Key deliverables — Daily Timeline Bar** ([Spec 010](../specs/010-daily-timelines/spec.md)):
- Per-card timeline indicator showing when each activity happened on a 24-hour line
- Combined day strip above the card list with category colour coding
- Responsive from 320px mobile to wide desktop — pure CSS, no charting library
- Dots for short entries (<5 min) and instant entries (ta-das, moments, tallies)

**Key deliverables — Onboarding & Help:**
- What's New popup for returning users on version upgrade
- New-user sensible defaults
- Help page section subtitles — visible "What is X?" descriptions without expanding accordions

**Key deliverables — Bug Fixes:**
- Moments list false empty state fixed (type filter + pagination)
- Celebration quality: milestone labels, active-day highlighting, record labels

**Key deliverables — Weekly Celebration Pipeline** ([Spec 009](../specs/009-weekly-rhythms/spec.md)):
- 4-tier celebration system: Stats Only, Private AI, Cloud AI Factual, Cloud AI Creative
- Monday celebration generation (3:33am) with email delivery (8:08am), per-user timezone-aware
- Weekly data aggregation: entry counts by type, session durations, week-over-week comparisons, personal records
- Per-rhythm chain status and all-time milestone tracking in celebrations

**Key deliverables — Thursday Encouragement:**
- Mid-week encouragement nudge (default Thursday 3:03pm) with general progress and rhythm-specific stretch goals
- In-app dismissible banner and optional push notification / email delivery
- Activity comparison against rolling 4-week averages
- Positive, guilt-free messaging — never shame-based

**Key deliverables — Email & Delivery Infrastructure:**
- HTML and plain text email delivery with retry and backoff
- One-click unsubscribe link in every email
- Bounce tracking with auto-disable after 3 consecutive failures
- In-app-only delivery as alternative to email

**Key deliverables — Settings & Configuration:**
- Weekly Rhythms settings panel with tier picker and plain-language privacy notices
- Independent toggles for Thursday encouragement and Monday celebration
- Email address configuration with in-app-only option
- All features off by default (opt-in only)

**Key deliverables — Testing:**
- 80 tests covering celebration pipeline, encouragement, delivery, cloud AI providers, stats aggregation, and messages

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

## v0.7.0: Features & Integrations

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
- [x] Notification types: milestone celebrations, rhythm encouragement — shipped in v0.6.0 (weekly rhythms)
- [ ] Quiet hours and frequency controls

### Automated Email (opt-in only)

- [ ] Journey milestone: "You've reached Building stage in Meditation!"
- [ ] Anniversary: "You've been with Ta-Da! for 1 year!"
- [x] Weekly/monthly digest (user must opt in) — weekly celebration shipped in v0.6.0
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
