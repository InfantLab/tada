# Tada Roadmap

Feature ideas and future plans, organized by version releases.

**Current Version:** v0.1.0 (MVP) ✅  
**Next Release:** v0.2.0 (Phase 2)

---

## v0.1.0: MVP — Foundation 🚧

_Status: In Progress - January 2026_

**Core Functionality:**

- [x] Project scaffolding (Nuxt 3, Bun, Drizzle)
- [x] Database schema (unified Entry model)
- [x] Database migrations
- [x] PWA configuration & Docker setup
- [x] Entry CRUD API (GET, POST, PATCH, DELETE)
- [x] Timeline view (connected to API)
- [x] Meditation timer with category selection
- [x] Timer start and end bells (separate configuration)
- [x] Timer wake lock (keep screen on during meditation)
- [x] Settings persistence (localStorage)
- [x] Quick add entry form (dreams, notes, achievements)
- [x] Journal page (displays journal-type entries)
- [x] Habits page scaffolding (placeholder for v0.2)
- [x] Settings page with data export (JSON)
- [x] Authentication system (Lucia Auth with password)
- [x] Login/register page
- [x] Version display (v0.1.0)

**Ontology & Emoji System (v0.1.0):**

- [x] Entry ontology: type + category + subcategory + emoji fields
- [x] Category defaults config with emojis and colors
- [x] Timer uses new ontology (type: timed, category: mindfulness, etc.)
- [x] Add page uses new ontology (tada, journal with subcategories)
- [x] Timeline displays emoji badges with category colors
- [x] Normalize type values (meditation → timed + mindfulness)
- [x] API endpoints accept and save category/subcategory/emoji
- [x] Robust error handling with fallbacks for missing data
- [x] Derived category lists (getTimedCategories) instead of hardcoding

**What Users Can Do:**

- ✅ Create account with password
- ✅ Track timed activities (meditation, music practice, etc.)
- ✅ Configure start/end bells separately
- ✅ Keep screen awake during meditation
- ✅ Log dreams, notes, and achievements
- ✅ View timeline of all entries
- ✅ Export data to JSON
- ✅ Install as PWA on any device
- ✅ Persist settings across sessions

**Known Limitations:**

- ⚠️ Habits tracking is placeholder only (coming in v0.2)
- ⚠️ No offline sync (PWA works but doesn't cache data locally)
- ⚠️ Single-user per instance (no multi-tenant support)

**Technical Debt & Future Improvements:**

- 🔧 **HIGH PRIORITY: Dedicated Ta-Da! add page** — Currently uses generic add form with dream/note options, losing the celebration magic (v0.2.0)
- 🔧 Error messages use `alert()` — should use toast/notification system (v0.2.0)
- 🔧 Legacy data migration — no automatic backfill of category/subcategory for pre-v0.1.0 entries
- 🔧 Journal filter options hardcoded — should derive from category/subcategory data
- 🔧 Subcategory collision (e.g., "walking" in mindfulness + movement) — flat lookup returns first match
- 🔧 No user customization of categories yet — defaults work but editing deferred to v0.2.0

---

## v0.2.0: Core Features — The Essential Experience

_Target: Q1 2026_

**Ontology & Customization:**

- [ ] Category/subcategory emoji editing in Settings
- [ ] Category color customization
- [ ] Subcategory auto-complete (remember user additions like "metta")
- [ ] Multi-category support for entries (e.g., concert → creative + events)
- [ ] Toast/notification system to replace alert() dialogs
- [ ] Legacy data backfill tool for pre-v0.1.0 entries without categories
- [ ] Context-aware subcategory resolution (fix "walking" collision between categories)
- [ ] Dynamic journal filter generation from actual entry data

**Habit Tracking:**

- [ ] Habit definitions API and UI
- [ ] Habit streak calculations (Seinfeld method)
- [ ] Calendar heatmap visualization
- [ ] Weekly/monthly habit reports

**Data Portability:**

- [ ] Data import (Insight Timer CSV)
- [ ] Data import (Meditation Helper SQLite)
- [ ] CSV export option
- [ ] Import history tracking (deduplication)

**Enhanced Features:**

- [ ] Timer profiles (save/load named configurations with duration, category, bells)
- [ ] Configurable start and end bells (different sounds allowed)
- [ ] Timer bell sounds library (download CC0 audio)
- [ ] Entry attachments (photos, audio recordings)
- [ ] Search and filtering on timeline
- [ ] Tags management UI

**Authentication (Optional):**

- [ ] Lucia Auth integration
- [ ] Optional password for self-hosted
- [ ] Session management
- [ ] Multi-user support preparation

**PWA Enhancements:**

- [ ] IndexedDB offline storage with sync
- [ ] Background sync when online
- [ ] Push notifications for habit reminders
- [ ] Wake Lock API for timer

---

## v0.3.0: Polish — Make it Delightful

_Target: Q2 2026_

## Phase 4: Advanced

_Power user features_

- [ ] Voice input with LLM processing
- [ ] Obsidian integration (dream journal sync)
- [ ] Calendar heatmap view
- [ ] Tags and categories
- [ ] Bulk import/export
- [ ] API for external integrations

---

## Entry Type Ideas

The unified Entry model supports any `type` value. Here are ideas beyond the core set:

### Currently Planned

- `timed` — Timer session (meditation, focus, etc.)
- `tada` — Accomplishment/celebration
- `dream` — Dream journal entry
- `note` — Free-form thought
- `habit` — Habit completion (auto-created by habit rules)

### Future Candidates

These fit the model but aren't in initial scope:

#### 🧘 Contemplative

- `zen` — Moment of presence, clarity, awakening
- `sync` — Synchronicity, meaningful coincidence
- `magick` — Ritual, sigil, working, result
- `insight` — Sudden understanding, aha moment
- `gratitude` — Appreciation practice

#### 🏃 Physical

- `exercise` — Workout, run, yoga
- `gps-track` — GPS-tracked activity (run, bike, hike)
- `reps` — Counted exercise (pushups, etc.)
- `sleep` — Sleep log with quality rating

#### 🎨 Creative

- `practice` — Music, art, skill practice
- `create` — Made something (art, code, writing)
- `learn` — Studied, read, course progress

#### 📊 Quantified

- `mood` — Mood check-in with rating
- `energy` — Energy level tracking
- `focus` — Focus/flow state log
- `substance` — Coffee, supplements, etc.

### Implementation Notes

Adding a new type requires:

1. No schema changes (Entry.type is open string)
2. Optional: Add emoji mapping in UI
3. Optional: Add type-specific fields in Entry.data
4. Optional: Add specialized input form

The beauty of the unified model is that new types are essentially free. The danger is UI clutter — we should add types only when there's a clear use case and the default "note" type isn't sufficient.

---

## Ideas Parking Lot

Random ideas that don't fit elsewhere yet:

- **Widgets** — iOS/Android home screen widgets showing streak
- **Apple Watch** — Quick entry from watch
- **Shortcuts/Tasker** — Automation integration
- **IFTTT/Zapier** — Webhook triggers
- **Notion sync** — Two-way sync with Notion databases
- **AI insights** — Pattern recognition, suggestions
- **Social sharing** — Optional streak sharing
- **Gamification** — Achievements, levels (controversial — might conflict with philosophy)
- **Focus mode** — Block distractions during timer
- **Pomodoro** — Work/break intervals
- **Spaced repetition** — Review past entries

---

## Non-Goals

Things we're explicitly _not_ building:

- ❌ **Social network** — This is personal, not social
- ❌ **Habit prescriptions** — We don't tell you what to do
- ❌ **Streaks as punishment** — Missing a day isn't failure
- ❌ **Notifications spam** — Minimal, user-controlled only
- ❌ **Monetization dark patterns** — No ads, no selling data
- ❌ **Feature bloat** — Simple > comprehensive

---

_Last updated: January 2026_
