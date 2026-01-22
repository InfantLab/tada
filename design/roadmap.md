# Ta-Da! Roadmap

Feature ideas and future plans, organized by version releases.

**Current Version:** v0.2.0 ✅ (shipped)  
**Next Release:** v0.3.0

---

## Version Summary

| Version    | Theme                       | Target              |
| ---------- | --------------------------- | ------------------- |
| **v0.1.0** | MVP — Foundation            | ✅ Shipped Jan 2026 |
| **v0.2.0** | Graceful Rhythms            | ✅ Shipped Jan 2026 |
| **v0.3.0** | Magic & Voice               | Feb 2026            |
| **v0.4.0** | Cloud Service (tada.living) | Mar 2026            |
| **v0.5.0** | Rituals & AI Insights       | Apr 2026            |
| **v0.6.0** | Integrations                | May 2026            |

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
  - Weekly High: 5+ days per week
  - Weekly Low: 3+ days per week
  - Weekly Target: Cumulative minutes per week
  - Monthly Target: Cumulative minutes per month
- Journey stages based on total hours:
  - Starting (<10h) → Building (10-100h) → Becoming (100-1000h) → Being (1000h+)
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

## v0.3.0: Magic & Voice

_Target: Q2 2026_

### Moved from v0.2.0 (not completed)

- [ ] **Email verification** (optional for self-hosted, required for cloud)
- [ ] Timezone selector UI for imports (backend ready)
- [ ] Settings page autosave
- [ ] Fix pre-existing logger test failures (7 tests)
- [ ] Rewrite integration tests with @nuxt/test-utils/e2e

### 🔗 Practice Links

- [ ] Link timer sessions to specific practices/resources
- [ ] "I'm practicing X" with optional URL (YouTube video, Insight Timer guided, etc.)
- [ ] Practice history: return to what worked
- [ ] Share practice links between users (future)

### 📸 Photo Attachments

- [ ] Attach photos to entries (priority feature)
- [ ] Photo gallery view for visual entries
- [ ] Capture from camera or select from library

### 🌙 Celestial Calendar Module

Optional "magic" layer for those who want it, completely invisible to those who don't.

- [ ] Moon phase display and tracking
- [ ] Lunar calendar integration (new moon, full moon, quarters)
- [ ] Optional: planetary hours, astrological transits
- [ ] Ritual timing suggestions (opt-in)
- [ ] Celestial data in entry metadata (moon phase when entry was created)

### ✨ Serendipity Capture

- [ ] Quick capture for synchronicities and meaningful coincidences
- [ ] "Just noticed something" minimal friction entry
- [ ] Pattern recognition over time (opt-in insights)
- [ ] Tag-based connections between serendipitous moments

### 🎙️ Voice Input with LLM

- [ ] Dictate entries via voice
- [ ] LLM processing to structure dictated content
- [ ] Extract category, mood, key details automatically
- [ ] Review/edit before saving
- [ ] Works offline with on-device processing (where possible)

---

## v0.4.0: Cloud Service — tada.living

_Target: Q3 2026_

### 🌱 Gentle Onboarding Tour

A soft, welcoming introduction that respects the user's intelligence and curiosity.

**Philosophy:**

- Onboarding should feel like a friend showing you around, not a mandatory training video
- Point out essentials, let them discover the rest naturally
- Never overwhelm — reveal features as they explore
- Celebrate their first actions, however small

**Initial Welcome (first visit):**

- [ ] Soft welcome overlay: "Welcome to Ta-Da! — a place to notice your life"
- [ ] Highlight top navigation row gently (Timer, Add, Tada, Journal)
- [ ] Single-sentence hints: "Start a meditation timer" / "Capture a win" / etc.
- [ ] Dismiss with any interaction — no forced clicks
- [ ] Remember dismissal (localStorage + user preference)

**Timer-specific guidance:**

- [ ] First timer start: gentle note "For best results, keep this tab in the foreground during your session"
- [ ] Explain: browsers throttle background tabs, bells may be delayed if backgrounded
- [ ] Show only once, remember dismissal

**Progressive Discovery:**

- [ ] Feature hints appear contextually when user explores new areas
- [ ] First timer completion: gentle celebration + "This is now in your collection"
- [ ] First dream logged: "Dreams are treasures worth remembering"
- [ ] First week: optional "Getting started" card on home (dismissible)
- [ ] Settings tour only when they visit Settings

**Returning Users:**

- [ ] New feature callouts (subtle badge/dot, not modal)
- [ ] "What's new" accessible from help, not forced
- [ ] Respect: once dismissed, stays dismissed

### ❓ Help & FAQ System

In-app guidance that feels like a wise friend, not a manual.

**Help Center (`/help`):**

- [ ] Beautiful, zen-like FAQ page matching app aesthetic
- [ ] Categories: Getting Started, Timer, Entries, Rhythms, Import, Privacy
- [ ] Searchable with fuzzy matching
- [ ] Expandable questions (accordion style)
- [ ] Direct links from relevant pages ("Need help? →")

**Contextual Help:**

- [ ] `?` icon in header (subtle, consistent location)
- [ ] Page-specific help panels (slide in, don't navigate away)
- [ ] Timer help: "Why does the timer count up?"
- [ ] Rhythm help: "How do graceful chains work?"
- [ ] Import help: "Where do I get my Insight Timer data?"

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

**In-App Bug Reporter:**

- [ ] Accessible from Help menu or Settings
- [ ] Calm, friendly interface: "Something not quite right?"
- [ ] Simple form: What happened? What did you expect?
- [ ] Optional: include browser/device info (with consent preview)
- [ ] Optional: attach screenshot or screen recording
- [ ] No account required for self-hosted (email optional for follow-up)

**For Cloud Users (tada.living):**

- [ ] Automatic context: user ID, app version, recent actions (with consent)
- [ ] Response acknowledgment: "We've heard you — thank you for helping Ta-Da improve"
- [ ] Status tracking: view submitted reports and responses
- [ ] Integration with support ticketing (Intercom/Zendesk/email)

**Implementation Notes:**

- Self-hosted: generates markdown report for GitHub issue or email
- Cloud: submits to backend → support queue
- Privacy: always show exactly what data will be sent before sending
- Never include entry content without explicit opt-in

### ☁️ Multi-Tenant Platform

Transform self-hosted app into hosted service at tada.living.

**Infrastructure:**

- [ ] Multi-tenant database architecture (tenant isolation)
- [ ] User registration and onboarding flow
- [ ] Account management dashboard
- [ ] Cross-device sync (real-time)
- [ ] Automated backups and recovery

**Billing (Stripe):**

- [ ] Subscription tiers (Free, Premium)
- [ ] Stripe integration for payments
- [ ] Usage-based limits (entries, storage)
- [ ] Trial period and conversion flow
- [ ] Cancellation and data export

**Legal & Compliance:**

- [ ] Privacy policy (GDPR-compliant)
- [ ] Terms of service
- [ ] Data processing agreements
- [ ] Cookie consent (minimal)
- [ ] Data deletion workflow

**Marketing & Content:**

- [ ] Landing page with philosophy messaging
- [ ] Blog with science/philosophy content:
  - Benefits of mindfulness tracking
  - Psychology of rhythm formation
  - Identity-based behavior change research
  - Contemplative practice traditions
- [ ] SEO optimization
- [ ] Email newsletter (opt-in)

**Self-Hosted Compatibility:**

- [ ] Self-hosted remains fully functional (no cloud required)
- [ ] Optional cloud backup for self-hosted users
- [ ] Migration path: self-hosted ↔ cloud

---

## v0.5.0: Rituals & AI Insights

_Target: Q4 2026_

### 🌅 Routines & Rituals

- [ ] Morning/evening routine builder
- [ ] Flexible ritual sequences (not rigid schedules)
- [ ] "Ritual mode" — guided flow through routine items
- [ ] Routine templates (shareable)
- [ ] Time-of-day awareness (morning routine vs evening wind-down)

### 🤖 AI Insights (with Guardrails)

Private, opt-in AI analysis with strong privacy protections.

**Philosophy:**

- All AI features are opt-in, off by default
- Data never leaves device without explicit consent
- No training on user data
- Insights suggest, never prescribe

**Features:**

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
- `tada` — Accomplishment/celebration
- `journal` — Dream, note, reflection (uses subcategory)
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
  - Show counts per entry type (timed, tada, dream, journal, note)
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

_Last updated: January 2026_
