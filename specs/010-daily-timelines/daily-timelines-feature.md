# Feature Request: Daily Timeline Bar

*A visual heartbeat of your day.*

## Overview

Add a minimalistic 24-hour timeline visualisation that shows when activities happened during the day. Appears in two places:

1. **Per-card indicator** — on each activity card in day view
2. **Combined day strip** — a single timeline above all cards showing the full day at a glance

## 1. Per-Card Timeline Indicator

### What
A subtle horizontal line on each activity card representing 24 hours. The activity's time is marked on that line:

- **Timed entries** (meditation, practice): a coloured bar, width proportional to duration
- **Ta-das** ⚡: a lightning bolt / small marker at the logged timestamp
- **Moments**: a dot or small marker at the timestamp
- **Tallies**: a dot or small marker at the timestamp

### Visual Treatment
- Very minimal — a thin line, almost background-level
- Colour of the activity marker matches the category colour (mindfulness = one colour, movement = another, etc.)
- No axis labels, no numbers — the position on the line IS the information
- Should feel like a watermark, not a chart

### Example (ASCII sketch)
```
┌─────────────────────────────────────────┐
│ 🧘 Meditation — 47 min                  │
│                                          │
│ ·····━━━━━━━·····························│
│ 0    6am        12pm        6pm      24  │
│      ^^^^^^^^                            │
│      (7:15-8:02, coloured block)         │
└─────────────────────────────────────────┘
```

The time labels shown above are for illustration — in practice, NO labels. Just the line and the block. Users intuit position from left = midnight, middle = noon, right = midnight.

### Constraints
- **Day view only** — hidden in week/month/year views
- Cards are already designed — this is an addition, not a redesign
- Must work on mobile width (320px+)
- If the duration is very short (<5 min), show as a dot rather than an invisible sliver

## 2. Combined Day Strip

### What
A single timeline bar at the top of the day view (below any daily summary, above the card list) showing ALL activities for that day overlaid on one 24-hour line.

### Visual Treatment
- Slightly more prominent than per-card indicators (maybe 2-3x taller)
- All timed events shown as coloured bars (stacked or overlapping if concurrent)
- Ta-das shown as ⚡ markers
- Moments and tallies shown as dots
- Colour-coded by category
- Still minimal — no axes, no grid, no labels
- Acts as a "visual diary strip" — instant overview of your day's rhythm

### Example (ASCII sketch)
```
Day strip:
━━━━▓▓▓▓━━━━━━━━━━━━━━━━⚡━━━━▓▓━━━━━━━━━⚡━━━━━▓▓▓━━━━
     ^^^^                 ^     ^^          ^      ^^^
     meditation           tada  run         tada   piano
     7:15-8:02                  12:30       15:20  19:00
                                -13:00             -19:45
```

### Interaction (optional, v2)
- Tapping/hovering a block on the combined strip could scroll to that card
- But v1 can be purely visual, no interaction

## Category Colours

Use existing category colours from `categoryDefaults.ts`. Key mappings:
- Mindfulness → (calm colour, blue/teal?)
- Movement → (energetic, green/orange?)
- Creative → (expressive, purple?)
- Accomplishment → (celebratory, gold/yellow?)
- Journal → (reflective, grey/slate?)
- Learning → (growth, blue?)
- Events → (social, pink/coral?)

Colours should be defined once and shared between the card indicators and the day strip.

## Technical Considerations

### Data Required
- Entry timestamp (start time) — already stored
- Entry duration (for timed entries) — already stored in data.duration_seconds
- Entry category — already stored
- Entry type — already stored

All data already exists. This is purely a presentation feature.

### Component Structure
```
components/
├── timeline/
│   ├── DayStrip.vue           # Combined day timeline
│   ├── CardTimeIndicator.vue  # Per-card mini timeline
│   └── TimelineUtils.ts       # Shared: time-to-position calc, colour mapping
```

### Rendering Approach
- Pure CSS/SVG — no charting library needed
- Position = `(entryHour * 60 + entryMinute) / 1440 * 100%` (percentage of day)
- Width (for timed) = `durationMinutes / 1440 * 100%`
- Minimum width for visibility: 0.5% (~7 minutes) or switch to dot

### Responsive
- Works at any width — percentage-based positioning scales naturally
- On very narrow screens, precision decreases but the visual rhythm still reads
- Consider hiding per-card indicators on mobile if too cramped (keep day strip)

## Scope

### V1 (this spec)
- Per-card time indicator (day view only)
- Combined day strip (day view only)
- Category colour coding
- Static / non-interactive

### V2 (future)
- Tap-to-scroll from day strip to card
- Tooltip on hover showing entry name + time
- Option to show/hide in settings
- Sleep/wake indicators if sleep tracking is added

## Design Philosophy

This is **noticing**, not analytics. The user glances at the day strip and sees:
- "Quiet morning, busy afternoon"
- "All my meditation happens before 9am"
- "I log ta-das in clusters"

Without numbers, without charts, without judgement. Just a visual trace of a day lived.

---

*Feature requested: 2026-03-15*
*"A day has a shape. This shows it."*
