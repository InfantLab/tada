# Ta-Da! Roadmap

Feature ideas and future plans, organized by version releases.

**Current Version:** v0.4.0 (shipping February 2026)
**Previous Releases:** v0.3.0, v0.3.1

---

## Version Summary

| Version    | Theme                       | Target              |
| ---------- | --------------------------- | ------------------- |
| **v0.1.0** | MVP — Foundation            | ✅ Shipped Jan 2026 |
| **v0.2.0** | Graceful Rhythms            | ✅ Shipped Jan 2026 |
| **v0.3.0** | Magic & Voice               | ✅ Shipped Jan 2026 |
| **v0.3.1** | REST API                    | ✅ Shipped Jan 2026 |
| **v0.4.0** | Ontology & Cloud Service    | ✅ Shipped Feb 2026 |
| **v0.4.1** | Polish & Fixes              | Feb 2026            |
| **v0.5.0** | Rituals, Celestial & AI     | Q4 2026             |
| **v0.6.0** | Integrations                | 2027+               |

---

## v0.1.0: MVP — Foundation ✅

_Status: Shipped January 2026_

See [CHANGELOG.md](../CHANGELOG.md) and [RELEASE_NOTES_v0.1.0.md](../RELEASE_NOTES_v0.1.0.md) for details.

**Delivered:**

- Unified Entry model with ontology (type/category/subcategory/emoji)
- Meditation timer with bells and wake lock
- Quick add for dreams, notes, ta-das
- Authentication system
- PWA with Docker deployment
- Data export (JSON)

---

## v0.2.0: Graceful Rhythms ✅

_Status: Shipped January 2026_

See [CHANGELOG.md](../CHANGELOG.md) and [RELEASE_NOTES_v0.2.0.md](../RELEASE_NOTES_v0.2.0.md) for details.

**Delivered:**

### 🔐 User Email & Password Recovery ✅

- Email field added to user schema
- Password reset flow with time-limited tokens
- SMTP configuration (supports standard providers)
- Email templates for password reset
- Rate limiting on reset requests
- "Change password" feature for logged-in users

### 🎯 Timer Philosophy: Count Up ✅

- Count-up timer as default
- Celebratory messaging: "You did 47 minutes!"
- Unified interval system with configurable duration, repeats, and bell sounds
- Warm-up countdown with "settling in" display
- Post-session mood and reflection capture
- Timer presets with save/load
- Mode auto-derived from intervals (Forever = unlimited)
- "No bells" mode for silent sessions

### 📥 Generic CSV Import Framework ✅

- CSV Mapper UI with column preview and mapping
- Import Recipes saved to database
- Built-in Insight Timer recipe
- Date/time format detection and parsing
- Duration parsing (H:MM:SS, seconds, minutes)
- Duplicate detection with externalId hash
- Batched database inserts (500 at a time)
- Progress bar with success/skip/error counts
- Downloadable error log for failed rows

### 🎨 User Customisation ✅

- Timer presets: Save named configurations
- Custom emojis: Change emoji for any category or subcategory
- Hide categories: Remove categories you don't use
- Delete category data: Delete all entries for a category
- Undo support: Recover from accidental deletions
- Entry type visibility: Show/hide entry types from journal

### 📉 Graceful Rhythm Chains ✅

- Multiple chain types:
  - Daily: Consecutive days with activity
  - 5×/Week: 5+ days per week
  - 3×/Week: 3+ days per week
  - 1×/Week: At least 1 day per week
  - 4×/Month: 4+ days per month
- Journey stages based on total hours:
  - Beginning (<10h) → Building (10-100h) → Becoming (100-1000h) → Being (1000h+)
- Year tracker (GitHub-style heatmap) with historical navigation
- Bar chart (28-day histogram) with period navigation
- Chain tabs for switching between chain types
- Context-aware encouragement messages
- Tier system: Starting → Steady → Strong → Daily

### 🎉 Ta-Da! First-Class Celebration ✅

- Post-save celebration page with confetti and sound effects
- Streak display and fun facts
- Distinct visual design from other entry types

### 📊 Timeline Scaling ✅

- Zoom toggle with Day/Week/Month/Year views
- Period summary cards for each view
- Infinite-scrolling paginated entry list
- Journey badge with zoom-aware stats

### 🔧 Polish ✅

- Developer error tracking panel
- Column auto-detection for CSV import with confidence scoring
- Toast/notification system (replaced alert() dialogs)
- 133+ unit tests with CI integration

---

## v0.3.0: Magic & Voice ✅

_Status: Shipped January 2026_

See [CHANGELOG.md](../CHANGELOG.md) and [RELEASE_NOTES_v0.3.0.md](../RELEASE_NOTES_v0.3.0.md) for details.

**Theme:** Polish the core experience. Magic Moments for capturing life's special instants. Voice input for friction-free entry. Practice links to connect sessions with resources.

### ✅ Completed This Version

- [x] Navigation restructure: Timeline → Ta-Da! → Moments → Sessions → Tally → Rhythms
- [x] Tally page for quick count/reps entries
- [x] Rename Timer → Sessions, Journal → Moments
- [x] Fix pre-existing test failures (logger + tokens module isolation, vitest config)
- [x] Remove unused `or` import in validate.post.ts
- [x] All 361 unit tests passing

### ✨ Magic Moments

Enhance Moments with special "Magic" captures — life's delightful surprises.

Magic moments include: **joy, delight, serendipity, zen, wonder, awe, gratitude, synchronicity**

- [x] Add "Magic" subcategory to Moments (emoji: 🪄)
- [x] Quick-capture button: "Something magical just happened" (on Moments page)
- [x] Minimal friction: just a text field + optional photo placeholder
- [x] Tag suggestions: joy, delight, serendipity, zen, wonder, awe, synchronicity, gratitude

### 🎙️ Voice Input with LLM

- [x] Dictate entries via voice
- [x] LLM processing to structure dictated content
- [x] Review/edit before saving
- [x] Works offline with on-device processing (where possible)
- [x] Voice-to-Tally: speak counts like "10 push-ups, 12 kettlebells, 30 squats"
- [x] Voice diagnostics for mobile PWA debugging
- [x] Voice-to-Moment: quick voice capture on moments page
- [x] Voice-to-Session: reflection capture with voice at session end

### 🔗 Practice Links

Connect sessions to specific practices, resources, or guided content.

- [x] Optional URL field on Sessions: "What were you practicing?"
- [x] Auto-detect YouTube, Insight Timer, Spotify links → show title/thumbnail
- [x] Link display on entry detail page

### 📸 Photo/Media System Foundations

Prepare the architecture for photo/video attachments. Actual capture and storage are premium features (v0.6.0+).

- [x] Photo placeholder component in Moments and Ta-Da! entries
- [x] Attachment data model design (schema for media references)
- [x] Photo gallery UI mockup in entry detail
- [x] Design document for cloud storage integration (S3/R2)

### 🧹 Polish & Fixes

Moved from v0.2.0 or newly identified:

- [x] Timezone selector UI for imports (dropdown with common timezones)
- [x] Settings page autosave (removed save button, added autosave indicator)

---

## v0.3.1: REST API ✅

_Status: Shipped January 2026_

**Theme:** Developer-friendly REST API for integrations and automation.

**Delivered:**

- Complete REST API v1 at `/api/v1/`
- Entries CRUD with filtering, pagination, bulk operations
- Rhythms API with progress tracking
- Insights API (summary and patterns)
- CSV import API with recipe support
- Export API (JSON/CSV)
- Webhooks for external integrations
- API key authentication
- Comprehensive test coverage (220+ tests)

---

## v0.4.0: Ontology & Cloud Service — tada.living ✅

_Status: Shipped February 2026_

See [CHANGELOG.md](../CHANGELOG.md) for details.

**Theme:** Cloud service launch at tada.living with gentle onboarding, help system, and GDPR compliance.

### ✅ Completed This Version

- [x] **Ontology Expansion (10 categories):**
  - Removed "Accomplishment" category (ta-das are entries, not a category)
  - Added **Health** (💚): sleep, nutrition, hydration, medical, mental, recovery, self care
  - Added **Work** (💼): project, meeting, deadline, win, growth
  - Added **Social** (👥): family, friends, community, connection
  - Added **Life Admin** (🏠): cleaning, laundry, cooking, errands, finances, maintenance, admin
  - Renamed "Journal" → **Moments** (💭): journal, dream, memory, idea, gratitude, intention, magic
  - Updated Creative emoji: 🎵 → 🎨

---

### 🧹 Cleanup & Deprecations

- [x] Remove deprecated `/add` page (replaced by inline capture on each entry type page)
- [x] Audit and remove unused components from v0.2.0 refactoring
  - Removed: `useVoiceQueue.ts` (unused composable)
  - Removed: `QuickNavScrubber.vue` (unused component)
  - Removed: `VoiceErrorBoundary.vue` (unused component)
  - Removed: `createEntry`, `createVoiceEntry` from `useEntrySave.ts` (deprecated)
- [ ] Rewrite integration tests with @nuxt/test-utils/e2e _(parked until v0.4.0 features complete)_

### 🌱 Gentle Onboarding Tour

A soft, welcoming introduction that respects the user's intelligence and curiosity.

**Philosophy:**

- Onboarding should feel like a friend showing you around, not a mandatory training video
- Point out essentials, let them discover the rest naturally
- Never overwhelm — reveal features as they explore
- Celebrate their first actions, however small

**Initial Welcome (first visit):** ✅

- [x] Soft welcome overlay: "Welcome to Ta-Da! — a place to notice your life"
- [x] Highlight top navigation row gently (Sessions, Add, Tada, Moments)
- [x] Single-sentence hints: "Start a meditation timer" / "Capture a win" / etc.
- [x] Dismiss with any interaction — no forced clicks
- [x] Remember dismissal (localStorage + user preference)

**Timer-specific guidance:**

- [ ] First timer start: gentle note "For best results, keep this tab in the foreground during your session"
- [ ] Explain: browsers throttle background tabs, bells may be delayed if backgrounded
- [ ] Show only once, remember dismissal

**Progressive Discovery:** ✅

- [x] Feature hints appear contextually when user explores new areas
- [x] First timer completion: gentle celebration + "This is now in your collection"
- [x] First dream logged: "Dreams are treasures worth remembering"
- [x] First week: optional "Getting started" card on home (dismissible)
- [x] Settings tour only when they visit Settings

**Returning Users:**

- [ ] New feature callouts (subtle badge/dot, not modal)
- [ ] "What's new" accessible from help, not forced
- [ ] Respect: once dismissed, stays dismissed

### ❓ Help & FAQ System

In-app guidance that feels like a wise friend, not a manual.

**Help Center (`/help`):** ✅

- [x] Beautiful, zen-like FAQ page matching app aesthetic
- [x] Categories: Getting Started, Timer, Entries, Rhythms, Import, Privacy
- [x] Searchable with fuzzy matching
- [x] Expandable questions (accordion style)
- [x] Direct links from relevant pages ("Need help? →")

**Contextual Help:** ✅

- [x] `?` icon in header (subtle, consistent location)
- [x] Page-specific help panels (slide in, don't navigate away)
- [x] Timer help: "Why does the timer count up?"
- [x] Rhythm help: "How do graceful chains work?"
- [x] Import help: "Where do I get my Insight Timer data?"

**FAQ Philosophy:**

- Answer the "why" behind features, not just "how"
- Reference the philosophy (count-up timers, identity over streaks)
- Warm, encouraging tone throughout
- Link to deeper reading in `/about` or blog (future)

**Sample FAQ Questions:**

- "Why don't timers count down?"
- "What happens if I miss a day?"
- "How is Ta-Da different from other rhythm trackers?"
- "Is my data private?"
- "How do I import from Insight Timer?"
- "Can I use Ta-Da offline?"

### 🐛 Bug Report Tool

Make reporting issues feel zen, not stressful.

**In-App Bug Reporter:** ✅

- [x] Accessible from Help menu or Settings
- [x] Calm, friendly interface: "Something not quite right?"
- [x] Simple form: What happened? What did you expect?
- [x] Optional: include browser/device info (with consent preview)
- [ ] Optional: attach screenshot or screen recording
- [x] No account required for self-hosted (email optional for follow-up)
- [x] Database storage for feedback (feedback table in schema)

**For Cloud Users (tada.living):**

- [x] Feedback stored in database with status tracking
- [ ] Automatic context: user ID, app version, recent actions (with consent)
- [ ] Response acknowledgment: "We've heard you — thank you for helping Ta-Da improve"
- [ ] Status tracking UI: view submitted reports and responses
- [ ] Integration with support ticketing (Intercom/Zendesk/email)

**Implementation Notes:**

- Self-hosted: stores in local database, exportable for support
- Cloud: stored in database with admin-only status management
- Privacy: always show exactly what data will be sent before sending
- Never include entry content without explicit opt-in

### ☁️ Cloud Platform (tada.living)

Transform self-hosted app into hosted freemium service. See [commercial.md](commercial.md) for full architecture.

_Core infrastructure implemented in commit `54a2dd5` (Feb 2026)._

**Cloud Mode Infrastructure:** ✅

- [x] Cloud mode detection (`TADA_CLOUD_MODE` / Stripe key presence)
- [x] Database schema: subscription fields on users table
- [x] Usage limits: 1-year rolling window for free tier
- [x] Email verification (required for cloud, optional for self-hosted)
- [x] Account page (`/account`) for subscription management

**Billing (Stripe):** ✅

- [x] Stripe Checkout integration (monthly/yearly)
- [x] Webhook handlers (subscription lifecycle events)
- [x] Customer Portal link (manage subscription)
- [x] UI: upgrade prompts, tier status display
- [x] Graceful archive notices for free tier users

**Legal & Compliance:** ✅

- [x] Privacy policy (GDPR-compliant)
- [x] Terms of service
- [x] Data processing agreements (`/dpa` page)
- [x] Cookie consent (minimal)
- [x] Data deletion workflow (DELETE /api/account + UI in /account)

**Marketing & Content:**

- [x] Landing page with philosophy messaging
- [x] Blog foundation (`/blog`) with philosophy content:
  - [x] "Why We Count Up" - the count-up timer philosophy
  - [x] "Identity Over Streaks" - identity-based behavior change
  - [x] "The Case for Graceful Rhythms" - flexible consistency
  - [ ] "The Four Seasons of Practice" - deep dive into Beginning → Building → Becoming → Being journey stages
  - [ ] "Your Data, Your Practice" - why open source and self-hostable matter for personal mindfulness data
  - [ ] "Moments, Not Metrics" - celebrating the unquantifiable (magic, dreams, gratitude, journal)
- [x] SEO optimization
- [x] Email newsletter (opt-in with database storage)
cd a
**tada.living Deployment:** ✅

- [x] CapRover deployment (manual via CLI)
- [x] Production environment config (`.env.example` documented)
- [x] Monitoring and alerting (health endpoint at `/api/health`)
- [x] Dev environment banner (prevents data confusion)
- [x] Dedicated `/register` page for new users
- [x] Account management section in Settings
- [ ] Automated backup scripts (can defer)
- [ ] Set up dedicated support@tada.living email account (can defer)

---

## v0.4.1: Polish & Fixes

_Target: March 2026_

**Theme:** Fix rough edges from v0.4.0 launch, session resilience, analytics, and mobile experience.

### ⏱️ Session Recovery ✅

Timed sessions are now resilient to interruptions (accidental navigation, phone calls, crashes).

- [x] Draft persisted to localStorage on session start, updated every 5s and on visibility change
- [x] Recovery modal on next visit: Resume, Save & Complete, or Discard
- [x] Stale drafts (>24h) auto-discarded
- [x] Works offline (PWA mode)
- [x] Extracted shared `timerTick()` helper (deduplication refactor)

### 📊 Optional Analytics ✅

- [x] Optional Umami analytics support (privacy-friendly, opt-in via env vars)
- [x] Zero impact when unconfigured — no scripts loaded

### 🎙️ Voice Entry Quirks

- [ ] Fix voice recording reliability on Android (PWA microphone issues)
- [ ] Improve LLM extraction accuracy (smarter parsing of ambiguous input)
- [ ] Clarify BYOK (Bring Your Own Key) settings — current UI is unclear about what keys are needed and where to get them
- [ ] Voice entries should set `category: "moments"` when creating moment subtypes (magic, dream, gratitude, journal)

### 🧹 Bug Fixes

- [x] Fix double toast notifications on entry creation (engine + caller both showing success)
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

- [ ] iOS/Android native apps (if needed beyond PWA)
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
