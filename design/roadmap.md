# Ta-Da! Roadmap

What's coming next. For what already shipped, see [CHANGELOG.md](../CHANGELOG.md) and the release notes.

**Current Version:** v0.4.1 (March 2026)

---

## Version History

| Version    | Theme                       | Status              | Details |
| ---------- | --------------------------- | ------------------- | ------- |
| **v0.1.0** | MVP — Foundation            | ✅ Shipped Jan 2026 | [Release Notes](../RELEASE_NOTES_v0.1.0.md) |
| **v0.2.0** | Graceful Rhythms            | ✅ Shipped Jan 2026 | [Release Notes](../RELEASE_NOTES_v0.2.0.md) |
| **v0.3.0** | Magic & Voice               | ✅ Shipped Jan 2026 | [Release Notes](../RELEASE_NOTES_v0.3.0.md) |
| **v0.3.1** | REST API                    | ✅ Shipped Jan 2026 | [CHANGELOG](../CHANGELOG.md) |
| **v0.4.0** | Ontology & Cloud Service    | ✅ Shipped Feb 2026 | [Release Notes](../RELEASE_NOTES_v0.4.0.md) |

## Upcoming

| Version    | Theme                       | Target   |
| ---------- | --------------------------- | -------- |
| **v0.4.1** | Polish & Fixes              | Mar 2026 |
| **v0.5.0** | Rituals, Celestial & AI     | Q4 2026  |
| **v0.6.0** | Integrations                | 2027+    |

---

## Carried Forward

Incomplete items from shipped versions that are still worth doing:

### From v0.4.0

- [ ] Rewrite integration tests with @nuxt/test-utils/e2e
- [ ] Timer-specific onboarding: "Keep this tab in the foreground" (first timer start)
- [ ] New feature callouts for returning users (subtle badge/dot, not modal)
- [ ] Bug reporter: attach screenshot or screen recording
- [ ] Bug reporter: automatic context (user ID, version, recent actions — with consent)
- [ ] Bug reporter: status tracking UI for submitted reports
- [ ] Automated backup scripts for CapRover
- [ ] Blog posts: "The Four Seasons of Practice", "Your Data, Your Practice", "Moments, Not Metrics"
- [ ] Set up dedicated support@tada.living email

---

## v0.4.1: Polish & Fixes

_Target: March 2026_

**Theme:** Fix rough edges from v0.4.0 launch, session resilience, analytics, and mobile experience.

### ✅ Done

- [x] Session recovery for interrupted timed entries (localStorage draft, recovery modal, stale draft cleanup)
- [x] Umami analytics runtime plugin (privacy-friendly, opt-in via env vars)
- [x] Voice privacy disclosure singleton fix (was reappearing after dismissal)
- [x] Server-side transcription: ArrayBuffer fix, Whisper hallucination filter, language/prompt hints
- [x] Simplified env var config (server-only values use plain names, removed broken env-compat plugin)
- [x] Dockerfile optimization (copy only native bindings, not all node_modules)
- [x] DevBanner uses window.location instead of runtimeConfig
- [x] Fix double toast notifications on entry creation
- [x] Version bump to 0.4.1

### 🎙️ Voice

- [ ] Improve LLM extraction accuracy (smarter parsing of ambiguous input)
- [ ] Clarify BYOK settings UI — unclear what keys are needed and where to get them
- [ ] Voice entries should set `category: "moments"` for moment subtypes

### 🧹 Bug Fixes
- [ ] Review and fix "Starting" label appearing in rhythm UI (should use journey stage names: Beginning, Building, Becoming, Being)

---

## v0.5.0: Rituals, Celestial & AI

_Target: Q4 2026_

### 🌙 Celestial Calendar Module

Optional "magic" layer for those who want it, completely invisible to those who don't.

- [ ] Moon phase display and tracking
- [ ] Lunar calendar integration (new moon, full moon, quarters)
- [ ] Optional: planetary hours, astrological transits
- [ ] Ritual timing suggestions (opt-in)
- [ ] Celestial data in entry metadata (moon phase when entry was created)

### 🔔 Supportive Push Notifications

Gentle, celebratory nudges — never pushy, never guilt-tripping.

**Philosophy:**

- Notifications celebrate, never nag
- "You meditated 5 days this week!" not "You haven't meditated today"
- User controls frequency and types completely
- Off by default — opt-in only

**Features:**

- [ ] Web Push API integration (PWA)
- [ ] Notification types: milestone celebrations, rhythm encouragement, weekly reflections
- [ ] Quiet hours and frequency controls
- [ ] Tone: warm, supportive, never pressuring

### 📧 Automated Email (Consider Carefully)

Celebration-driven emails — never spam, never guilt. Same philosophy as push notifications: off by default, celebrate what you did, not what you missed.

**Implemented in v0.4.0:**

- [x] Email verification, password reset, welcome, password changed
- [x] Supporter welcome (checkout complete)
- [x] Subscription renewed, cancelled, payment failed, payment recovered

**Consider for v0.5.0 (opt-in only):**

- [ ] Journey milestone: "You've reached 🌿 Building stage in Meditation!" (on stage transition)
- [ ] Anniversary: "You've been with Ta-Da! for 1 year!" (annual celebration)
- [ ] Weekly/monthly digest: summary of sessions, ta-das, rhythm streaks (user must opt in)

**Explicitly NOT doing:**

- No "we miss you" re-engagement emails — if someone stops, respect that
- No "you haven't practiced" guilt nudges
- No marketing emails to existing users
- No digest emails unless the user explicitly turns them on

### 🔧 Smarter Conflict Resolution

Current "Replace" wipes all overlapping entries. Need more intelligent approach:

- [ ] Multi-select: Choose which specific entries to replace (checkbox list)
- [ ] Category-aware: Only replace entries of the same category/activity
- [ ] Preview: Show what will be deleted before confirming
- [ ] Undo support: Allow recovery of replaced entries
- [ ] Import integration: Same UI for CSV import duplicate handling
- [ ] Merge option: Combine durations/counts instead of replacing

### 🌅 Routines & Rituals

- [ ] Morning/evening routine builder
- [ ] Flexible ritual sequences (not rigid schedules)
- [ ] "Ritual mode" — guided flow through routine items
- [ ] Routine templates (shareable)
- [ ] Time-of-day awareness (morning routine vs evening wind-down)

### 🔗 Practice Links Enhancement

Build on v0.3.0 practice links with history and suggestions.

- [ ] Recent Practices: "Return to this practice" quick-launch dropdown
- [ ] Suggested practices based on category/subcategory
- [ ] Practice frequency stats ("Used 5 times", "Last: 2 days ago")

### 🏠 Configurable Home Screen

Personalizable dashboard for the landing page.

- [ ] Home screen design (see docs/plans/landingpage.md)
- [ ] Widget-based layout (rhythms, recent entries, quick actions)
- [ ] User-configurable widget order and visibility

### ✨ Magic Moments Enhancement

- [ ] Pattern view over time (see your magic moments together)
- [ ] Magic moments timeline/calendar visualization

### 🤖 AI Insights (with Guardrails)

Private, opt-in AI analysis with strong privacy protections.

**Philosophy:**

- All AI features are opt-in, off by default
- Data never leaves device without explicit consent
- No training on user data
- Insights suggest, never prescribe

**Features:**

- [ ] Auto-extract category, mood, and key details from voice input
- [ ] Pattern recognition (weekly/monthly rhythms)
- [ ] Gentle observations: "You tend to meditate more on weekends"
- [ ] Correlation hints: "Sleep quality seems better after evening meditation"
- [ ] Identity reinforcement: "You've been consistent as a meditator this month"
- [ ] Anomaly awareness: "This week looks different — everything okay?"

**Privacy Controls:**

- [ ] Granular opt-in per insight type
- [ ] On-device processing option
- [ ] Data retention controls
- [ ] Easy disable/delete

---

## v0.6.0: Integrations

_Target: 2027+_

### 🔌 External Integrations

- [ ] Obsidian integration (dream journal sync, markdown export)
- [ ] Notion sync (two-way database sync)
- [ ] Apple Health / Google Fit (meditation minutes)
- [ ] IFTTT / Zapier webhooks
- [ ] Public API for custom integrations
- [ ] Calendar integration (schedule ritual times)

### 📱 Platform Expansion

- [ ] **Decouple frontend from SSR** — prerequisite for everything below. Rebuild as static SPA talking to REST API. See [decisions.md](decisions.md#native-mobile-not-yet-but-know-the-path) for full analysis.
- [ ] iOS/Android native apps via Capacitor (requires SPA decoupling first)
- [ ] Apple Watch quick entry
- [ ] Home screen widgets (streak, quick capture)
- [ ] Shortcuts/Tasker automation

---

## Entry Type Ideas

The unified Entry model supports any `type` value. Current types:

- `timed` — Timer session (meditation, focus, etc.)
- `tada` — Celebration (accomplishments, gratitude, wins)
- `moment` — Reflective entry (dream, journal, reflection)
- `tally` — Count-based entry (reps, glasses of water)
- `rhythm` — Rhythm completion (auto-created by rhythm rules)

### Future Candidates

#### 🧘 Contemplative

- `sync` — Synchronicity, meaningful coincidence
- `insight` — Sudden understanding, aha moment
- `gratitude` — Appreciation practice

#### 🏃 Physical

- `exercise` — Workout, run, yoga
- `sleep` — Sleep log with quality rating

#### 🎨 Creative

- `practice` — Music, art, skill practice
- `create` — Made something (art, code, writing)

Adding a new type requires no schema changes — just use it!

---

## Ideas Parking Lot

- **Gamification** — Achievements, levels (careful: might conflict with philosophy)
- **Focus mode** — Block distractions during timer
- **Pomodoro** — Work/break intervals (conflicts with count-up philosophy?)
- **Spaced repetition** — Review past entries
- **Social sharing** — Optional, never required

### 📊 Timeline Stats & Breakdown (Parked)

_Parked: Conflicts with philosophy — we're not productivity hackers._

- **Category breakdown in journey stats:**
  - Show counts per entry type (timed, tada, moment, tally)
  - Show hours per category (mindfulness, accomplishment, etc.)
  - Show subcategory distribution within categories
- **Interactive stats dashboard:**
  - Tap category to filter timeline
  - Visual bar charts for distribution
  - Trends over time (week-over-week, month-over-month)
  - Browse past imports with success/skip/error counts
  - Re-run or delete previous imports
  - View detailed error logs per import
  - Filter by recipe/source/date

---

## Non-Goals

Things we're explicitly _not_ building:

- ❌ **Social network** — This is personal, not social
- ❌ **Rhythm prescriptions** — We don't tell you what to do
- ❌ **Countdown timers** — We count up, celebrating what you did
- ❌ **Streaks as punishment** — Missing a day isn't failure
- ❌ **Notifications spam** — Minimal, user-controlled only
- ❌ **Monetization dark patterns** — No ads, no selling data
- ❌ **Feature bloat** — Simple > comprehensive

---

_Last updated: March 2026_
