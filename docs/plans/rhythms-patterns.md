# Rhythms — Pattern Visualization 🌸

**Status:** Proposed  
**Target:** v0.3.0+  
**Location:** Rhythms tab  
**Created:** January 2026

---

## Philosophy

> _Show patterns as constellations to discover, not boxes to tick._

The Rhythms tab should:

- **Reveal** what you're already doing naturally
- **Celebrate** consistency without punishing breaks
- **Invite** reflection, not comparison
- **Visualize** time as something beautiful, not a scoreboard

---

## "Constellations" — Pattern Visualization

Visualize your practice like stars forming patterns in the night sky.

### 1. Heat Calendar ☀️

A GitHub-style contribution grid, but softer and celebration-focused.

**Design:**

- 7×52 grid (one year)
- Intensity = time spent that day (not just "did/didn't")
- Use lotus gradient colors, not harsh green
- Days with entries glow softly, empty days are just quiet (not failures)
- Tap any day to see entries

**Colors (dark theme):**

```
None:      #2B0F3A (cosmic violet, barely visible)
Light:     #6BB7E8 (lotus sky, soft glow)
Medium:    #3FB7A5 (lotus teal)
Deep:      #6EDC9A (lotus jade)
Intense:   #FFC83D (solar gold — exceptional days)
```

**Key distinction:** Empty days aren't "missed" days — they're just quiet days. No red, no X marks.

---

### 2. Weekly Rhythm Rings 🔵

Circular visualization showing your natural weekly pattern.

**Design:**

```
        Mon
     ╭──────╮
   Sun       Tue
   │    🪷    │
   Sat       Wed
     ╰──────╯
        Fri
         │
        Thu
```

- Each day segment sized by total time that weekday
- Reveals natural patterns: "I practice more on weekends"
- Animated gentle pulse on current day

---

### 3. Cumulative Lotus 🪷

A growing lotus flower where each petal represents time accumulated.

**Concept:**

- Start with a small seed (0-10 hours)
- Petals emerge as you accumulate time (each 10h = new petal)
- Full bloom at 100 hours, then a second layer begins
- Purely decorative/celebratory, no pressure

**Animation:** Gentle breathing animation, subtle sparkle when new petal appears

---

### 4. Time River 🌊

A flowing timeline showing activity density over months/years.

**Design:**

- Horizontal river flowing left to right (past → present)
- Width/intensity shows activity level
- Major "waves" are visible periods of intense practice
- "Tributaries" for different categories (mindfulness, movement, etc.)

**Insight text examples:**

- "Your practice deepened in October 2025"
- "Movement became part of your rhythm in March"

---

### 5. Streak Celebration (gentle, not punitive)

**Current streaks** shown as:

- "7 days of morning practice 🌅"
- "Mindfulness for 3 weeks 🧘"

**Breaks handled kindly:**

- No "you lost your streak!" messaging
- Instead: "Your longest morning streak: 21 days"
- "You practiced 4 out of 7 days this week"

---

### 6. Category Breakdown 📊

Simple, optional breakdown of where your time goes:

```
Your rhythms this year:
🧘 Mindfulness    124h (72%)  ████████████░
🏃 Movement        32h (18%)  ███░░░░░░░░░░
🌙 Dreams          16h (10%)  ██░░░░░░░░░░░
```

**Philosophy:** Show proportions, not deficits. Never "you should do more X."

---

## Implementation

### Phase 1: Heat Calendar

- New `GET /api/rhythms/calendar` endpoint
- Returns day-by-day activity summary
- Simple SVG-based calendar component

### Phase 2: Weekly Rings

- Aggregate by day-of-week
- D3.js or SVG-based circular chart

### Phase 3: Cumulative Lotus

- Track total hours (simple counter)
- CSS/SVG animation for growth
- Optional: save lotus state for consistency

### Phase 4: Streaks + Categories

- Calculate streaks server-side
- Store category totals for quick retrieval

---

## API Endpoints

```typescript
// Calendar heatmap data
GET /api/rhythms/calendar
  ?year=2025
  → { days: [{ date: "2025-01-15", totalSeconds: 1800, entryCount: 2 }, ...] }

// Weekly pattern
GET /api/rhythms/weekly
  ?from=2025-01-01
  &to=2025-12-31
  → { weekdays: [{ day: "Monday", totalSeconds: 28800, entryCount: 52 }, ...] }

// Category breakdown
GET /api/rhythms/categories
  ?from=2025-01-01
  → { categories: [{ name: "mindfulness", totalSeconds: 446400, percentage: 72 }, ...] }

// Streaks and totals
GET /api/rhythms/summary
  → {
      totalHours: 172,
      totalSessions: 520,
      currentStreaks: [{ name: "Morning practice", days: 7 }],
      longestStreaks: [{ name: "Daily mindfulness", days: 21 }],
      lotusLevel: 17  // petals earned
    }
```

---

## UI Components

```
pages/rhythms.vue
├── RhythmHeader (title + time range)
├── HeatCalendar
├── WeeklyRhythm (circular rings)
├── CumulativeLotus
├── CurrentStreaks (gentle celebration)
├── CategoryBreakdown
└── InsightCard ("Your practice deepened in...")
```

---

## Related

- See [timeline-scaling.md](timeline-scaling.md) for timeline improvements
- See [visual design.md](../../design/visual%20design.md) for color tokens
- See [roadmap.md](../../design/roadmap.md) for v0.3.0+ scope

---

_Last updated: January 2026_
