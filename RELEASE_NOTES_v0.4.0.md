# Ta-Da! v0.4.0 Release Notes

**Release Date:** February 2026
**Codename:** Gentle Growth 🌱

---

## What's New in v0.4.0

The biggest release yet. Ta-Da! grows from a personal practice tool into a cloud-hosted platform at **tada.living** — with an expanded ontology covering 10 life categories, a completely redesigned rhythm system that tracks your journey stage instead of confusing frequency tiers, and a warm onboarding experience that welcomes new users like a friend showing them around.

---

## Highlights

### 🌿 Expanded Ontology — 10 Life Categories

Ta-Da! now covers your whole life, not just meditation. Six new categories join the original four:

| Category | Emoji | Examples |
|----------|-------|---------|
| **Mindfulness** | 🧘 | meditation, breathwork, body scan |
| **Creative** | 🎨 | music, writing, art, craft |
| **Movement** | 🏃 | yoga, running, walking, dance |
| **Learning** | 📚 | reading, study, language, skills |
| **Health** | 💚 | sleep, nutrition, hydration, self care |
| **Work** | 💼 | project, meeting, deadline, growth |
| **Social** | 👥 | family, friends, community, connection |
| **Life Admin** | 🏠 | cleaning, cooking, errands, finances |
| **Moments** | 💭 | journal, dream, memory, gratitude, magic |
| **Celebration** | 🎉 | ta-da entries (accomplishments, wins) |

The old "Accomplishment" category is retired — ta-das are their own entry type, not a category. "Journal" is renamed to "Moments" to better reflect its breadth.

### ☁️ Cloud Platform — tada.living

Ta-Da! is now available as a hosted service at **tada.living** while remaining fully open-source and self-hostable.

**For users:**
- **Freemium model** — Free tier with 1-year rolling window; paid plans via Stripe
- **Account management** — Email verification, password reset, subscription portal
- **Data sovereignty** — Full data export, account deletion (GDPR-compliant)

**Marketing & content:**
- **Landing page** — Philosophy-driven introduction for new visitors
- **Blog** — Three articles on the Ta-Da! philosophy: "Why We Count Up", "Identity Over Streaks", "The Case for Graceful Rhythms"
- **Newsletter** — Opt-in email updates (GDPR-compliant)

**Legal & compliance:**
- Privacy policy, terms of service, data processing agreement (DPA)
- Cookie consent banner (cloud mode only)
- DELETE /api/account with cascade deletion and Stripe subscription cancellation

### 🌱 Journey Stages Replace Tier Labels

Rhythm cards now show your **journey stage** — a measure of total experience — instead of confusing weekly frequency labels like "Starting" or "At Least Once."

- **Beginning** — Just getting started
- **Building** — Developing your practice (10+ hours, 21+ sessions, or 100+ reps)
- **Becoming** — It's becoming part of you (100+ hours, 100+ sessions, or 1,000+ reps)
- **Being** — You ARE this practice (1,000+ hours, 365+ sessions, or 10,000+ reps)

Journey stages adapt to your rhythm type: hours for timed activities, session count for moments and ta-das, rep count for tallies. Your stage never goes backward — breaks reset chains but not your accumulated experience.

### 🔗 Unified Chain System

All five chain types now work identically across timed, tally, and activity rhythms — every chain counts **completed days**, not cumulative minutes.

- **Daily** — Consecutive days completed (counted in days)
- **5×/Week** — 5+ completed days per week (counted in weeks)
- **3×/Week** — 3+ completed days per week (counted in weeks)
- **1×/Week** — 1+ completed day per week (counted in weeks)
- **4×/Month** — 4+ completed days per month (counted in months)

The collapsed rhythm card shows your **best active chain** with clear context: "10 weeks of 3×/wk" or "45-day daily streak." Chain-aware nudge messages tell you exactly how many more days you need this week.

### 🎊 Activity Rhythms (Moments & Ta-Das)

Create rhythms for moments and ta-da celebrations — not just timed sessions and tallies. Activity rhythms use **session-based completion**: any entry on a day counts as complete. No duration thresholds, no count targets — just show up.

- "Daily Gratitude" rhythm tracking gratitude moments
- "Dream Journal" rhythm counting dream entries
- "Celebrate Daily" rhythm around ta-da entries
- Year tracker and month calendar render with entry-count intensity

### 🤝 Gentle Onboarding

A warm welcome that respects your intelligence and curiosity — like a friend showing you around.

- **Welcome overlay** — Soft introduction on first visit, dismissed with any interaction
- **Progressive discovery** — Feature hints appear contextually as you explore new areas
- **First-week card** — "Getting Started" guidance on the home page (dismissible)
- **Settings tour** — Gentle explanation of key sections on first visit to Settings
- **Celebrations** — Your first timer completion, first dream, first ta-da all get acknowledged

### ❓ Help & FAQ System

In-app guidance that answers "why" not just "how."

- **Help center** (`/help`) — Searchable FAQ with 6 categories, expandable answers
- **Contextual help** — `?` icon in the header opens page-specific help panels
- **Direct links** — "Need help?" links on Sessions, Rhythms, and Settings pages
- **Philosophy-first** — Explains *why* the timer counts up, *why* chains are graceful

### 🐛 Friendly Bug Reporter

- Calm, friendly interface: "Something not quite right?"
- Simple form with optional system info (shown before sending)
- Feedback stored in database with status tracking
- No account required for self-hosted users

### 🌙 Dream Tracking Improvements

- **Vividness scale** — Rate dream vividness from 1-5 with a joyful star picker
- **Lucidity toggle** — Mark dreams as lucid with a dedicated switch
- **Quick add menu** — Fast entry creation from the moments page header

### 📱 Mobile UX

- **Scrollable modals** — All 12+ modal panels now scroll properly on phone screens
- **Responsive rhythm creation** — Create and edit rhythms on small screens

---

## Technical Changes

### Added

- 6 new entry categories: Health, Work, Social, Life Admin (Moments and Celebration restructured)
- Cloud mode infrastructure: Stripe billing, usage limits, email verification
- Database tables: `newsletter_subscribers`, `feedback`, `onboarding_progress`
- New API endpoints: newsletter subscribe, feedback, onboarding progress, health check
- Journey threshold system: `hours`, `sessions`, or `count` per rhythm type
- Completion mode: `threshold` (duration/count) or `session` (any entry = complete)
- `calculateMonthlyDaysChain()` for month-based chain calculation
- Activity-based intensity rendering in year tracker and month calendar
- Contextual help panels, getting started card, welcome overlay
- Blog with 3 philosophy articles
- Privacy policy, terms of service, DPA pages
- Dream vividness and lucidity database fields and UI
- Idempotent database migrations for safe production deployment

### Changed

- Ontology: 4 categories → 10, "Journal" → "Moments", removed "Accomplishment"
- All chain types now count completed days (weekly/monthly targets previously counted cumulative time)
- Journey stage calculation supports multiple threshold types (hours/sessions/count)
- Rhythm card layout: journey stage badge + weekly progress + best chain
- "Session" renamed to "Activity" in rhythm UI to avoid confusion with timer sessions
- `matchCategory` optional for moment/tada rhythms (matchType alone is sufficient)
- Landing page shows marketing site for unauthenticated visitors

### Fixed

- Ta-da/moment rhythm creation failing (matchCategory incorrectly required)
- Year tracker and month calendar blank for activity-based rhythms
- Chain labels misrepresenting what chains actually measure
- Weekly rhythm status using inconsistent day-elapsed counts
- Nudge messages not accounting for chain type context
- Modal overflow on mobile devices (12 panels across 9 files)
- Double toast notifications on entry creation
- Database migrations failing on re-run in production

### Removed

- `/add` page (replaced by inline capture on each entry type page)
- `calculateWeeklyTargetChain()` / `calculateMonthlyTargetChain()` (replaced by unified day-counting functions)
- Forced `matchCategory` for ta-da and moment rhythms
- Unused components: `QuickNavScrubber`, `VoiceErrorBoundary`, `useVoiceQueue`

---

## Database Migrations

Multiple migrations in this release:

- **Ontology tables** — New categories and subcategories
- **Cloud tables** — `newsletter_subscribers`, `feedback`, `onboarding_progress`, subscription fields
- **Dream fields** — Vividness and lucidity columns on entries
- **Rhythm redesign** (`0020_journey_thresholds`) — `completion_mode`, `journey_threshold_type`, `journey_thresholds`

All migrations run automatically on startup. Existing rhythms are updated: tally rhythms get `count` thresholds, moment/tada rhythms get `session` completion mode.

**For self-hosted users:** No manual action required. Cloud features are disabled by default.

---

## Upgrade Notes

**Breaking Changes:** None. All existing data is preserved.

**Self-hosted users:** Your setup continues to work unchanged. Cloud features (billing, newsletter, onboarding) are disabled unless you set `TADA_CLOUD_MODE=true`.

**Chain recalculation:** Existing chain statistics will recalculate on next visit using the new completed-days logic. Weekly/monthly target chains that previously measured cumulative minutes now measure completed days — your numbers may change but they'll be more meaningful.

---

## Philosophy

> "Your journey stage is yours forever. Chains measure consistency; journey stages measure commitment."

v0.4.0 separates two ideas that were conflated: **how often you practice this week** (chains) and **how far you've come overall** (journey stage). A broken chain doesn't erase your experience. Whether you're beginning, building, becoming, or being — that's a reflection of everything you've put in, and it only moves forward.

The expanded ontology reflects the same philosophy: Ta-Da! isn't just for meditation. It's for noticing your whole life — the creative work, the daily admin, the social connections, the dreams you remember to write down. Everything counts.

---

**Thank you for using Ta-Da!** 🎊
