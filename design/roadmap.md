# Tada Roadmap

Feature ideas and future plans, organized by priority and phase. This keeps the SDR focused on core architecture while giving us a place to capture inspiration.

## Phase 1: Foundation (Current)
*Get the basics working*

- [x] Project scaffolding (Nuxt 3, Bun, Drizzle)
- [x] Database schema (unified Entry model)
- [x] PWA configuration
- [x] Docker setup
- [ ] Entry CRUD API
- [ ] Timeline view (connected to API)
- [ ] Basic auth (password login)
- [ ] Meditation timer with bells

## Phase 2: Core Features
*The essential experience*

- [ ] Habit streak calculations (Seinfeld method)
- [ ] Dream journal with metadata (lucid, vivid, emotions)
- [ ] Data export (JSON, CSV)
- [ ] Data import (Insight Timer, Meditation Helper)
- [ ] Settings persistence
- [ ] Offline support (IndexedDB sync)

## Phase 3: Polish
*Make it delightful*

- [ ] Timer bell sounds (download CC0 from Freesound)
- [ ] Timer presets (save/load configurations)
- [ ] Entry attachments (images, audio)
- [ ] Search and filtering
- [ ] Statistics and visualizations
- [ ] Dark mode toggle (currently system-only)

## Phase 4: Advanced
*Power user features*

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

Things we're explicitly *not* building:

- ❌ **Social network** — This is personal, not social
- ❌ **Habit prescriptions** — We don't tell you what to do
- ❌ **Streaks as punishment** — Missing a day isn't failure
- ❌ **Notifications spam** — Minimal, user-controlled only
- ❌ **Monetization dark patterns** — No ads, no selling data
- ❌ **Feature bloat** — Simple > comprehensive

---

*Last updated: January 2026*
