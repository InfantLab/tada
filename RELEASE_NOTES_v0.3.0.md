# Ta-Da! v0.3.0 Release Notes

**Release Date:** January 27, 2026  
**Theme:** Magic & Voice

---

## 🎤 Voice Input Everywhere

The biggest feature in v0.3.0 is **voice input** across all entry pages. Just tap the green microphone button and start speaking — your words become entries automatically.

### How It Works

1. **Tap green mic** → Recording starts immediately (no second click needed)
2. **Speak naturally** → Web Speech API transcribes in real-time, Whisper fallback for accuracy
3. **LLM processing** → Extracts structured data (ta-das, tallies, notes) from your speech
4. **Review & save** → Edit extracted data before saving

### Voice on Every Page

- **Ta-Da!** — Speak multiple accomplishments: "Finished the report, fixed the bug, helped Sarah with her presentation"
- **Moments** — Capture reflections, dreams, gratitude: "Had a wonderful conversation with mom about childhood memories"
- **Tally** — Count activities: "10 push-ups, 12 kettlebells, and 30 squats"
- **Sessions** — Post-session reflection: "Felt calm and focused today, mind was quiet"

### Smart Extraction

The LLM understands context and extracts:

- **Multiple ta-das** from one spoken sentence
- **Counts and activities** from natural speech
- **Subcategories** automatically (work, health, social, etc.)
- **Journal types** (magic moment, dream, gratitude, reflection)

---

## 🪄 Magic Moments

New **magic moments** capture brings more intentionality to your journal entries:

- **Magic subcategory** — Mark special moments that deserve remembering
- **Celebration overlay** — Animated confetti and your preferred ta-da sound
- **Smart text splitting** — Title and notes extracted automatically from voice

---

## ⏱️ Sessions Page Improvements

### Voice Reflection

Post-session reflection is now **one tap**:

- Green mic button appears after stopping timer
- Starts recording immediately (no toggle buttons)
- Transcription populates reflection field automatically

### Quality of Life

- **Bell sound preview** — Hear chimes when selecting them
- **Last preset remembered** — Your favorite timer loads automatically
- **Save options modal** — Choose to save fixed time or total time (including overtime)
- **Skip button fixed** — Now properly discards sessions without saving
- **Clockwise circle animation** — Timer circle finally fills/empties clockwise (no more backwards animation!)

---

## 📊 Tallies: A New Way to Track

**Tallies** are a new entry type for counting discrete activities — perfect for fitness, habits, and anything you measure by reps or occurrences.

### What Are Tallies?

Think of tallies as your **quick count tracker**:

- **Push-ups** — 25 reps
- **Water** — 8 glasses today
- **Kettlebell swings** — 50 reps
- **Pages read** — 47 pages
- **Gratitudes** — 3 things you're thankful for

Unlike timers (which track duration) or ta-das (which celebrate accomplishments), tallies track **how many times** you did something.

### Why Tallies Matter

Before tallies, you'd have to:
- Create a ta-da for each set of push-ups (felt excessive)
- Use sessions with notes (awkward for counts)
- Track externally and manually log (breaks the flow)

Now you can **quickly log counts** right when they happen, and Ta-Da! remembers:
- Your most common activities (easy quick-add presets)
- Trends over time (coming in v0.4.0)
- Your patterns and rhythms (building on v0.2.0's graceful chains)

### Tally Voice Input (New!)

Count-based activities are now voice-enabled:

```
"10 push-ups, 12 kettlebells, and 30 squats"
↓
3 tally entries extracted with counts
```

**Features:**
- **Pending review panel** — Edit counts and categories before saving
- **Per-item categories** — Choose movement type for each activity
- **Smart extraction** — Understands "50 reps", "8 glasses", "three sets of 25"
- **Rule-based extraction** — Fast and accurate for simple counts
- **LLM fallback** — Handles complex sentences like "did my usual morning workout plus 10 extra"

**Example voice inputs that work:**
- "10 push-ups" → 1 tally
- "25 squats, 15 lunges, 30 crunches" → 3 tallies
- "drank 8 glasses of water today" → 1 tally
- "completed 3 sets of 25 reps" → 1 tally (75 total)

---

## 🛠️ Developer Experience

### Database Stability

**Major fix:** Resolved EINVAL errors and server crashes:

- Database moved outside watched directory (`/workspaces/tada/data/`)
- No more SQLite journal file watcher conflicts
- Migration script handles the move automatically
- Production unchanged (uses `DATABASE_URL` env var)

### Error Handling

New centralized error handling:

- Type-safe error message extraction
- Structured logging with context
- Consistent user feedback across all pages
- 18+ unit tests for reliability

### New Utilities

- `utils/errorHandling.ts` — Error extraction, logging, and handling
- `server/db/manager.ts` — Database health checks, retry logic, graceful shutdown
- `server/db/operations.ts` — Safe database operations with automatic retry
- `components/CelebrationOverlay.vue` — Reusable celebration UI

### Dev Container Improvements

- Zsh with autosuggestions and syntax highlighting
- Starship prompt for better context
- fzf (Ctrl-R for fuzzy history search)
- ripgrep, bat, eza (modern CLI tools)
- Persistent command history across container rebuilds

---

## 🎯 What's Next: v0.4.0

**Theme:** Cloud Service (tada.living)

- Authentication improvements (multi-device support)
- Data sync between devices
- Web-based signup (no Docker required)
- E2E tests with Playwright
- Public beta launch preparation

---

## 📦 Upgrade Guide

### For Users

1. **Voice Features:** Just tap the green mic on any page — no setup needed!
2. **Database Migration:** Dev database moved to avoid watcher conflicts. Run migration script if you have existing data:
   ```bash
   cd /workspaces/tada
   ./scripts/migrate-db-location.sh
   ```
3. **New Sessions UX:** Green mic button for reflections, bell sound previews, save options for overtime

### For Developers

1. **Pull latest changes**
2. **Run database migration** (if you have local dev data)
3. **Restart dev server** — Database path changed, old location will throw errors
4. **Check logs** — Should see no more EINVAL errors
5. **Review new utilities** — `errorHandling.ts` for consistent error patterns

---

## 🐛 Known Issues

- Voice transcription requires internet connection (Web Speech API + Whisper cloud)
- Voice quality depends on microphone and environment
- LLM extraction may occasionally misinterpret complex sentences
- Rate limit: 1 voice request per 10 seconds per user

---

## 🙏 Thank You

Special thanks to:

- Early testers who reported the timer circle backwards animation (finally fixed!)
- Everyone who provided feedback on voice input UX
- The Nuxt, Bun, and Drizzle communities for excellent tools and support

---

## 📚 Documentation

- [CHANGELOG.md](CHANGELOG.md) — Full change history
- [design/roadmap.md](design/roadmap.md) — Future plans
- [docs/DATABASE_LOCATION_MIGRATION.md](docs/DATABASE_LOCATION_MIGRATION.md) — Database migration guide
- [docs/ERROR_HANDLING.md](docs/ERROR_HANDLING.md) — Error handling patterns
- [docs/VOICE_AI_ARCHITECTURE.md](docs/VOICE_AI_ARCHITECTURE.md) — Voice system design

---

**Celebrate your accomplishments. Notice your patterns. Remember your life.**

— Ta-Da! Team
