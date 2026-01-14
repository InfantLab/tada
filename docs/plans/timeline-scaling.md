# Timeline Scaling Plan 🌊

**Status:** Proposed  
**Target:** v0.2.0+  
**Created:** January 2026

---

## The Problem

With 4000+ entries, the current timeline faces several challenges:

- Loading all entries at once is slow and memory-intensive
- Scrolling through years of history is tedious
- No way to find specific entries without endless scrolling
- No sense of accumulated achievement or progress
- Currently limited to 100 entries (hardcoded)

---

## Design Philosophy

> _"TA-DA should feel like a moment, not a metric."_

The timeline should:

- **Celebrate accumulation** without obsessing over numbers
- **Reveal patterns** without prescribing goals
- **Enable discovery** without creating pressure
- **Stay zen** — spacious, calm, never overwhelming

---

## Proposed Solutions

### 1. "Flowing River" Virtualized Timeline

Load only what's visible, unload what scrolls away.

**Implementation:**

- Use virtual scrolling (vue-virtual-scroller) to render only ~20-30 visible items
- Fetch in chunks (50 entries at a time, cursor-based pagination)
- Smooth infinite scroll with "Load more" fallback for accessibility
- URL updates as you scroll through time periods (bookmarkable)

**Zen touch:** Soft fade-in as entries appear, gentle momentum scrolling

**Technical:**

```typescript
GET /api/entries?limit=50&cursor=<lastEntryId>
// Returns { entries: [...], nextCursor: string | null }
```

---

### 2. "Time Telescope" — Zoom Levels

Switch between granularity views like looking through a telescope at different distances.

| Level        | View                 | Shows                              |
| ------------ | -------------------- | ---------------------------------- |
| 🔭 **Year**  | Yearly summary cards | "2025: 487 sessions, 156 hours"    |
| 📆 **Month** | Monthly groupings    | Each month as expandable section   |
| 📅 **Week**  | Weekly clusters      | Natural weekly rhythm              |
| ☀️ **Day**   | Current default      | Individual entries grouped by date |

**Transition:** Tap a year → zooms to months in that year → tap month → zooms to days

**Accumulated time display:**

- Each zoom level shows total time for that period
- Use cosmic visual metaphor: "156 hours ≈ 6.5 days of practice" ✨

---

### 3. "Gentle Filter" — Find Without Friction

Search and filter that feels like browsing, not hunting.

**Components:**

- **Search pill** at top — expands on tap, auto-suggests recent terms
- **Category chips** — quick filter by mindfulness, movement, dreams, etc.
- **Time range picker** — "This week", "This month", "This year", custom range
- **Activity type filter** — timed, journal, ta-da, all

**UI Pattern:**

```
┌─────────────────────────────────────┐
│ 🔍 Search...          [🧘] [🌙] [⚡] │
│ This week ▼   All activities ▼      │
└─────────────────────────────────────┘
```

**Results:** Entries matching filter appear with subtle highlight, count shown

---

### 4. "Today First" Default View

Prioritize the present moment, make history accessible but not overwhelming.

**Structure:**

```
┌─────────────────────────────────────┐
│ TODAY                    + Add new  │
├─────────────────────────────────────┤
│ 🧘 Sitting meditation        23m    │
│ ⚡ Finished the report!             │
├─────────────────────────────────────┤
│ THIS WEEK           47 entries      │
│ ◯◯◯◯◉◯◯ (mini week dots)           │
│   [See all →]                       │
├─────────────────────────────────────┤
│ YOUR JOURNEY                        │
│ 🪷 156 hours across 487 sessions    │
│   [Explore →]                       │
└─────────────────────────────────────┘
```

Only today's entries load initially. "See all" expands to full virtualized timeline.

---

### 5. Quick Navigation Bar

A subtle, always-accessible time navigator.

**Implementation:**

- Thin bar at screen edge (right side on desktop, bottom on mobile)
- Scrub to jump through time
- Shows year markers: '24, '25, '26
- Current position indicated by subtle glow
- Labels appear on hover/touch: "March 2025"

---

### 6. Accumulated Time Celebration

Show total time as a quiet badge of honor, not a pressure metric.

**Display options:**

- "156 hours of practice" in header or stats section
- Human-readable conversions: "≈ 6.5 days" or "≈ 1 week"
- Category breakdown on demand (not by default)

**Philosophy:** Celebrate what you've done, never what you "should" do.

---

## Implementation Priority

| Phase | Feature                        | Effort | Impact               |
| ----- | ------------------------------ | ------ | -------------------- |
| **1** | Pagination + virtual scroll    | Medium | High (performance)   |
| **2** | Search + category filter       | Medium | High (findability)   |
| **3** | Time range picker              | Low    | Medium               |
| **4** | Zoom levels (month/year views) | Medium | High (overview)      |
| **5** | Accumulated time display       | Low    | Medium (celebration) |
| **6** | Quick nav scrubber             | Medium | Medium (navigation)  |

---

## Technical Approach

### API Changes

```typescript
// Paginated entries (cursor-based for infinite scroll)
GET /api/entries
  ?limit=50
  &cursor=<lastEntryId>  // cursor-based pagination
  &from=2025-01-01       // date range filter
  &to=2025-01-31
  &category=mindfulness  // category filter
  &type=timed            // entry type filter
  &search=meditation     // full-text search

// Aggregated summary for zoom levels
GET /api/entries/summary
  ?period=month          // or: year, week, all-time
  &year=2025             // optional: limit to specific year
  → Returns {
      periods: [
        { label: "January 2025", entryCount: 47, totalSeconds: 28800, ... },
        ...
      ],
      totals: { entryCount: 487, totalSeconds: 561600 }
    }

// Quick stats for dashboard
GET /api/entries/stats
  → Returns {
      totalHours: 156,
      totalSessions: 487,
      oldestEntry: "2024-01-15",
      thisWeek: { count: 12, hours: 4.5 },
      categories: { mindfulness: 400, movement: 50, ... }
    }
```

### Component Architecture

```
pages/index.vue
├── TimelineHeader
│   ├── SearchPill
│   ├── CategoryChips
│   └── TimeRangePicker
├── ZoomToggle (day/week/month/year)
├── VirtualTimeline (virtualized entry list)
│   ├── DateGroup
│   └── EntryCard
├── QuickNavScrubber
└── JourneyBadge (accumulated time)
```

### Dependencies

- `vue-virtual-scroller` or similar for virtualization
- Cursor-based pagination in API
- SQLite aggregation queries for summaries

---

## What We're NOT Building

- ❌ Complex analytics dashboards (not a metric factory)
- ❌ Streak pressure ("you broke your streak!")
- ❌ Comparison to others or "averages"
- ❌ Notification spam about achievements
- ❌ Forced gamification

---

## Related

- See [rhythms-patterns.md](rhythms-patterns.md) for pattern visualization features (for Rhythms tab)
- See [roadmap.md](../../design/roadmap.md) for overall v0.2.0 scope

---

_Last updated: January 2026_
