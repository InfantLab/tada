# Ta-Da! Roadmap

Feature ideas and future plans, organized by version releases.

**Current Version:** v0.1.0 ✅ (shipped)  
**Next Release:** v0.2.0

---

## Version Summary

| Version    | Theme                       | Target              |
| ---------- | --------------------------- | ------------------- |
| **v0.1.0** | MVP — Foundation            | ✅ Shipped Jan 2026 |
| **v0.2.0** | Core Experience             | Jan 2026            |
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

## v0.2.0: Core Experience

_Target: Q1 2026_

### 🎯 Timer Philosophy: Count Up

All timers count up, never down. We celebrate what you did, not what you "should" do.

- [ ] Count-up timer as default (hide/remove countdown option)
- [ ] Celebratory messaging: "You did 47 minutes!" not "Goal: 60 min"
- [ ] Optional gentle milestones (chime at 10, 20, 30 min) — celebration, not pressure
- [ ] Timer profiles: save/load named configurations (duration hint, category, bells)

### 🎨 Custom Activities

- [ ] User-defined activities beyond defaults
- [ ] Custom emoji picker for any activity
- [ ] Subcategory auto-complete (remember user additions like "metta", "walking")
- [ ] Context-aware subcategory resolution (fix "walking" collision between categories)

### 📉 Graceful Habit Chains

Chains that bend, not break. When struggling, suggest easier tier instead of broken chain.

- [ ] Tiered frequency targets:
  - Tier 1: Daily (strict Seinfeld chain)
  - Tier 2: 5 days/week
  - Tier 3: 3 days/week
  - Tier 4: 30 minutes/week
  - Tier 5: X times/month
- [ ] Automatic tier suggestion when streak would break
- [ ] Identity-based framing: "You're becoming a meditator" not "47 sessions"

### 🔗 Practice Links

- [ ] Link timer sessions to specific practices/resources
- [ ] "I'm practicing X" with optional URL (YouTube video, Insight Timer guided, etc.)
- [ ] Practice history: return to what worked
- [ ] Share practice links between users (future)

### 📸 Photo Attachments

- [ ] Attach photos to entries (priority feature)
- [ ] Photo gallery view for visual entries
- [ ] Capture from camera or select from library

### 🔧 Polish

- [ ] Toast/notification system (replace `alert()` dialogs)
- [ ] Dedicated Ta-Da! add page with celebration magic
- [ ] Category/subcategory emoji editing in Settings
- [ ] Legacy data backfill tool for pre-v0.1.0 entries

---

## v0.3.0: Magic & Voice

_Target: Q2 2026_

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
  - Psychology of habit formation
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
- `habit` — Habit completion (auto-created by habit rules)

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

---

## Non-Goals

Things we're explicitly _not_ building:

- ❌ **Social network** — This is personal, not social
- ❌ **Habit prescriptions** — We don't tell you what to do
- ❌ **Countdown timers** — We count up, celebrating what you did
- ❌ **Streaks as punishment** — Missing a day isn't failure
- ❌ **Notifications spam** — Minimal, user-controlled only
- ❌ **Monetization dark patterns** — No ads, no selling data
- ❌ **Feature bloat** — Simple > comprehensive

---

_Last updated: January 2026_
