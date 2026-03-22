# Data Model: Daily Timeline Bar

**Feature**: 010-daily-timelines | **Date**: 2026-03-22

## Overview

This feature introduces **no new persistent data**. All data is derived from existing entry fields at render time. This document describes the computed data structures used by the timeline components.

## Source Data (Existing)

All fields come from the existing `entries` table / entry objects:

| Field | Type | Source | Used For |
|-------|------|--------|----------|
| `timestamp` | `string` (ISO 8601) | `entries.timestamp` | Timeline position (horizontal placement) |
| `durationSeconds` | `number \| null` | `entries.duration_seconds` | Bar width (timed entries) |
| `category` | `string \| null` | `entries.category` | Colour lookup |
| `type` | `string` | `entries.type` | Render as bar (`timed`, `exercise`) or dot (`tada`, `moment`, `tally`) |

## Computed Structures

### TimelineRange

Defines the time boundaries for the displayed timeline.

```
TimelineRange {
  start: Date        // Range start (day view: midnight 00:00:00)
  end: Date          // Range end (day view: next midnight 00:00:00)
  totalMs: number    // Total milliseconds in range (day: 86,400,000)
}
```

**Future extension**: For week view, `start` = Monday 00:00, `end` = next Monday 00:00, `totalMs` = 604,800,000.

### TimelineEntry

A lightweight computed representation of an entry for timeline rendering.

```
TimelineEntry {
  id: string              // Entry ID (for keying in v-for)
  positionPercent: number  // 0-100, where on the timeline this entry starts
  widthPercent: number     // 0-100, how wide the bar is (0 for instant entries)
  isDot: boolean           // true if entry should render as dot (instant or <5min)
  color: string            // Hex colour from category palette (e.g., "#7C3AED")
  type: string             // Entry type for marker style selection
}
```

**Derivation**:
- `positionPercent` = `(entryTimestamp - range.start) / range.totalMs * 100`
- `widthPercent` = `(durationSeconds * 1000) / range.totalMs * 100` (0 for instant types)
- `isDot` = `type not in ['timed', 'exercise'] OR durationSeconds < 300`
- `color` = `CATEGORY_DEFAULTS[entry.category]?.color ?? '#9CA3AF'`

### Rendering Rules

| Entry Type | Render As | Position | Width | Minimum Size |
|------------|-----------|----------|-------|--------------|
| `timed` (>= 5min) | Coloured bar | Timestamp % | Duration % | 0.5% of range |
| `timed` (< 5min) | Dot | Timestamp % | Fixed 6px | 6px |
| `exercise` (>= 5min) | Coloured bar | Timestamp % | Duration % | 0.5% of range |
| `exercise` (< 5min) | Dot | Timestamp % | Fixed 6px | 6px |
| `tada` | Dot | Timestamp % | Fixed 6px | 6px |
| `moment` | Dot | Timestamp % | Fixed 6px | 6px |
| `tally` | Dot | Timestamp % | Fixed 6px | 6px |

### Midnight Clipping

For entries that span past the range boundary (e.g., a meditation started at 11:30pm lasting 60 minutes):

```
effectiveEnd = min(entryEnd, range.end)
effectiveStart = max(entryStart, range.start)
widthPercent = (effectiveEnd - effectiveStart) / range.totalMs * 100
```

## Data Flow

```
Existing entries (from store/API)
  → Filter by displayed date
  → Map to TimelineEntry[] via useTimelinePosition composable
  → Pass to TimelineStrip (all entries) and CardTimeIndicator (single entry)
  → Render as CSS-positioned elements
```

No data is persisted, cached, or transmitted. All computation happens in the browser at render time.
