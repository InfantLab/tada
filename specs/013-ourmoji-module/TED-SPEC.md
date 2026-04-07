# Spec 012: Ourmoji Module

**Status:** Draft
**Author:** Ted (via Caspar's brief)
**Date:** 2026-03-29
**Target:** v0.5.0+ (standalone internal module)
**Access:** Restricted — select users only (Caspar + Marian initially)

---

## Overview

Ourmoji is Ta-Da!'s first "secret module" — a chaos magick daily practice and dream divination experiment, built as an internal module using the modular architecture from `design/modularity.md` (Option B: Internal Module Registry).

Two parts:
1. **Daily Ourmoji** — log the daily emoji + reflection as a Ta-Da! event
2. **Dream Experiment** — a controlled dream telepathy protocol managed entirely within Ta-Da!

Philosophy: this module must be **beautiful**, **magical**, and follow the Ta-Da! ethos of "noticing, not tracking." It should feel like opening a grimoire, not filling out a form.

---

## Part 1: Daily Ourmoji

### What It Does

Each morning, an emoji is drawn from the Sacred Set (23 curated emoji with symbolic resonance). A poetic reflection links the emoji to the moon phase, the date, and any significant days from the Wheel of the Year.

Currently this happens via OpenClaw cron → WhatsApp/Telegram. Ta-Da!'s role is **not** to replace that delivery — it's to **log and display** the daily Ourmoji as a first-class event.

### Data Model

Entry type: `ourmoji` (new type, registered via module registry)

```typescript
interface OurmojiData {
  emoji: string;                    // The day's emoji
  reflection: string;               // 2-3 sentence poetic text
  moonPhase: string;                // e.g., "Waxing Crescent"
  moonIllumination: number;         // 0-100
  wheelOfYear?: string;             // If a named day (e.g., "Beltane", "Bowie Day")
  wheelCategory?: string;           // e.g., "Discordian", "Pagan", "Málaga"
  source: "manual" | "api";         // How it arrived (manual entry vs API push)
}
```

### UI: Ourmoji Panel

A dedicated panel (not a full page — accessible from Moments or its own nav entry for enabled users):

- **Today's Ourmoji** — large emoji display, reflection text, moon phase visualisation
- **Calendar view** — scroll through past Ourmojis, see the emoji for each day
- **Wheel of the Year** — visual representation of upcoming named days (optional, stretch goal)

### API Integration

Ta-Da! REST API endpoint to receive the daily Ourmoji from OpenClaw:

```
POST /api/ourmoji/daily
Authorization: Bearer <api-key>
{
  "emoji": "🐙",
  "reflection": "Three hearts, each pumping blue blood...",
  "moonPhase": "Waning Gibbous",
  "moonIllumination": 72,
  "wheelOfYear": "World Octopus Day",
  "date": "2026-10-08"
}
```

This creates an `ourmoji` entry for the authenticated user. If an entry already exists for that date, it updates rather than duplicates.

### The Sacred Set

The 23 curated emoji (stored as module config, not in the DB schema):

```
😜 trickster/play · 😳 surprise/vulnerability · 🤩 wonder/dazzle
🧠 mind/consciousness · 🐷 earthiness/appetite · 🐸 transformation/patience
🦄 magic/rarity · 🐙 intelligence/adaptation · 🐳 depth/song
🍀 luck/chance · 🍄 altered states/hidden networks · 🪞 reflection/truth
🛸 mystery/the unknown · 🌏 wholeness/home · 🌋 eruption/creation
🌊 flow/power · 🌀 chaos/spiral · 🎲 randomness/risk
🔔 awakening/call · 🗝️ access/secrets · ⚰️ endings/renewal
🥚 potential/beginning · 💓 pulse/life
```

### Wheel of the Year

The module includes a static data file of ~65 named days (see `WHEEL_OF_THE_YEAR.md` in the OpenClaw workspace). This powers:
- Contextual notes in the daily reflection ("Today is also Yuri's Night 🚀")
- Calendar highlights in the Ourmoji panel
- Moveable feasts (lunar-dependent dates) need annual recalculation

---

## Part 2: Dream Experiment

### Protocol

A controlled dream telepathy experiment based on the Maimonides protocol, adapted for emoji:

#### Roles
- **Sender** — receives a target emoji from the Sacred Set, focuses on it before sleep
- **Receiver** — records their dream on waking, then guesses which emoji was sent
- **Control (double receiver)** — both participants are receivers, no sender. Establishes chance baseline.
- **Rest night** — no assignment. Baseline/gap night.

#### Nightly Flow

1. **Evening (~21:00):** Ta-Da! randomly assigns roles for the night
   - Conditions weighted or configured: e.g., 50% send, 30% control, 20% rest
   - If **send condition**: one person randomly becomes sender, the other receiver
   - If **control condition**: both are receivers (no sender assigned)
   - If **rest**: no notification sent
   
2. **Sender notification:** "Tonight you are the Sender. Your target emoji is: 🐙. Focus on it as you fall asleep."

3. **Receiver notification:** "Tonight you are the Receiver. Record your dream when you wake."
   - Receiver does NOT know if there is a sender (blinded)

4. **Morning:** Receiver opens Ta-Da! and:
   - Records their dream (free text / voice transcription — links to existing Moments dream journal)
   - Makes their guess: picks an emoji from the Sacred Set (forced choice, 1 of 23)
   - Optionally rates confidence (1-5)
   
5. **Reveal:** After the receiver submits their guess:
   - Show the target emoji (if send condition) or "Control night — no target" (if control)
   - Show hit/miss
   - On control nights, still show which emoji was "closest" for interest (no scoring)

#### Experiment Management

- **Experiment runs:** defined start/end dates, can be paused/resumed
- **Randomisation seed:** stored per experiment for reproducibility
- **Role assignment algorithm:** cryptographically random, but balanced over the run (roughly equal sender/receiver splits per participant)
- **Blinding:** receiver never knows if it's a send or control night until after guessing
- **Data locked after submission:** dream text + guess cannot be edited post-submission (scientific integrity)

### Data Model

New entry type: `dream-experiment` (or stored as `moment` subcategory `dream-experiment` — TBD based on modularity constraints)

```typescript
interface DreamExperimentEntry {
  experimentId: string;              // Which experiment run
  nightDate: string;                 // YYYY-MM-DD
  condition: "send" | "control" | "rest";
  role: "sender" | "receiver" | null;
  targetEmoji: string | null;        // The emoji assigned (null for rest/control-receiver)
  dreamText: string | null;          // Receiver's dream transcript
  guess: string | null;              // Receiver's emoji guess
  guessConfidence: number | null;    // 1-5
  isHit: boolean | null;             // guess === targetEmoji
  revealedAt: string | null;         // ISO timestamp of when result was shown
  lockedAt: string | null;           // ISO timestamp — no edits after this
}
```

### Statistics Dashboard

For experiment runs:
- **Hit rate** vs chance (1/23 = 4.35%)
- **Binomial test** p-value (is the hit rate significantly above chance?)
- **By condition:** send vs control hit rates
- **By participant:** does one person receive better?
- **By emoji:** are some emoji "louder" than others?
- **Timeline:** cumulative hit rate over the experiment run
- **Moon phase correlation:** hit rate by lunar phase (because why not)

### Dream Recording UX

This is the critical UX challenge. The receiver needs to:
1. Record their dream (text or voice → transcript)
2. Guess the emoji
3. See the reveal

**All in one flow, without clicking around multiple pages.**

Proposed flow:
1. Receiver opens Ta-Da! in the morning
2. **Experiment banner** at top: "You were a Receiver last night. Record your dream to see the result."
3. Tap → opens **Dream Experiment panel**:
   - Voice record button (large, prominent) → transcribes dream
   - Or text input for typing
   - "Submit dream" → locks the text
4. **Guess screen:** Sacred Set grid (23 emoji), tap one to guess
   - Optional confidence slider
   - "Submit guess" → locks the guess
5. **Reveal animation:** the target emoji appears (or "Control night — no target was sent")
   - Hit: celebration animation (confetti, à la Ta-Da!)
   - Miss: gentle, no shame — show the target, maybe a poetic note about what the connection *could* have been
   - Control: "No sender tonight. Your dream was pure signal from your own depths."

**Dreams outside the experiment:** regular dream logging via Moments continues to work independently. The experiment panel is an overlay/flow, not a replacement.

---

## Access Control

Module visibility controlled by a feature flag per user:

```typescript
// User settings or admin config
{
  enabledModules: ["ourmoji"]  // Array of module IDs
}
```

Users without `ourmoji` in their enabled modules never see the panel, nav entry, or API endpoints. This is dev privilege — no public UI to enable it.

---

## File Structure (Internal Module)

Following the modularity architecture (Option B):

```
app/modules/
  ourmoji/
    index.ts                    # Module registration
    types.ts                    # OurmojiData, DreamExperimentEntry types
    config.ts                   # Sacred Set, Wheel of the Year data
    
    components/
      OurmojiPanel.vue          # Daily emoji display + calendar
      DreamExperimentFlow.vue   # Morning recording + guess + reveal
      SacredSetPicker.vue       # 23-emoji grid for guessing
      MoonPhase.vue             # Moon phase visualisation
      ExperimentStats.vue       # Statistics dashboard
      WheelOfYear.vue           # Calendar of named days (stretch)
    
    composables/
      useOurmoji.ts             # Daily emoji CRUD
      useDreamExperiment.ts     # Experiment state, role assignment, statistics
      useExperimentScheduler.ts # Evening assignment logic
    
    server/
      api/
        ourmoji/
          daily.post.ts         # Receive daily Ourmoji from external (OpenClaw)
          daily.get.ts          # Get today's / historical Ourmoji
          experiment/
            assign.post.ts      # Trigger nightly assignment
            dream.post.ts       # Submit dream recording
            guess.post.ts       # Submit emoji guess
            reveal.get.ts       # Get reveal for a night
            stats.get.ts        # Experiment statistics
            runs.get.ts         # List experiment runs
            runs.post.ts        # Create/configure experiment run
```

---

## Implementation Phases

### Phase 1: Daily Ourmoji (MVP)
- Entry type registration (`ourmoji`)
- API endpoint to receive daily Ourmoji from OpenClaw
- Simple panel showing today's emoji + reflection + moon
- Calendar view of past Ourmojis
- Access control (user feature flag)

### Phase 2: Dream Experiment Core
- Experiment run management (create, start, pause, end)
- Nightly role assignment (random, blinded)
- Morning flow: dream recording → guess → reveal
- Data locking post-submission
- Basic statistics (hit rate, p-value)

### Phase 3: Polish & Delight
- Moon phase visualisation
- Wheel of the Year calendar view
- Reveal animations (confetti on hit, gentle on miss)
- Voice recording for dreams (reuse existing voice infrastructure)
- Extended statistics (by emoji, by moon phase, by participant)
- Dream text analysis (stretch: keyword extraction, theme matching)

---

## Design Principles

1. **Magical, not clinical** — this is a grimoire, not a lab notebook. Beautiful typography, moon imagery, the Sacred Set displayed as sacred objects.
2. **Rigorous where it counts** — blinding, randomisation, locked data, statistical tests. The magic is real AND the science is real.
3. **Frictionless morning flow** — one tap from waking to dream recorded. Voice first. The fewer taps between pillow and transcript, the better the data.
4. **Shared ritual** — this is for two people. The UI should feel intimate, not social-media-ish. No leaderboards. Just two people and the space between them.
5. **Ta-Da! philosophy** — noticing, not tracking. The experiment celebrates the dream, not the hit rate. A miss is still a dream worth having.

---

## Open Questions

1. **Entry type vs subcategory?** Should `ourmoji` and `dream-experiment` be new entry types (requiring module registry) or subcategories under `moment`? New types are cleaner but require the modularity work.
2. **Notification delivery:** How does Ta-Da! send the evening "you are the sender" notification? Push notification (PWA)? Or delegate to OpenClaw/WhatsApp?
3. **Multi-user experiment state:** The experiment links two users. How is this modeled? A shared `experiment_runs` table with participant IDs? Or something simpler?
4. **Wheel of the Year data source:** Static JSON in the module? Or fetched from the OpenClaw workspace dynamically?
5. **Voice recording reuse:** Can we reuse the existing `VoiceRecorder` component from v0.3.0, or does the dream flow need a custom variant?

---

*"The emoji is Glycon — obviously arbitrary, powerful anyway."*

*Spec drafted by Ted, 2026-03-29. Based on Caspar's voice brief + Marian's original question (2026-03-15) + Maimonides dream telepathy protocol.*
