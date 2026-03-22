# Quickstart: Daily Timeline Bar

**Feature**: 010-daily-timelines | **Date**: 2026-03-22

## What This Feature Does

Adds two visual elements to the day view:
1. **Per-card indicator** — a subtle 24-hour timeline on each activity card showing when it happened
2. **Day strip** — a combined timeline above all cards showing every activity overlaid on one line

Both are purely visual, non-interactive, and use existing data.

## Files to Create

| File | Purpose |
|------|---------|
| `app/composables/useTimelinePosition.ts` | Shared positioning logic: timestamp-to-percentage, width calculation, dot threshold |
| `app/components/timeline/TimelineStrip.vue` | Combined day strip component |
| `app/components/timeline/CardTimeIndicator.vue` | Per-card mini timeline component |

## Files to Modify

| File | Change |
|------|--------|
| `app/components/VirtualTimeline.vue` | Add `CardTimeIndicator` to each entry card template (lines ~363-443) |
| `app/pages/index.vue` | Add `TimelineStrip` above `VirtualTimeline` in day view |

## Files to Read (No Changes)

| File | Why |
|------|-----|
| `app/utils/categoryDefaults.ts` | Source for category colours |
| `app/server/db/schema.ts` | Reference for entry fields |

## Implementation Order

1. **`useTimelinePosition.ts`** — the composable that both components depend on. Write unit tests first.
2. **`CardTimeIndicator.vue`** — simpler component (single entry). Test in isolation.
3. **Integrate CardTimeIndicator into VirtualTimeline.vue** — add to card template, gate on day view.
4. **`TimelineStrip.vue`** — combined strip (multiple entries, overlap handling).
5. **Integrate TimelineStrip into index.vue** — add above VirtualTimeline, gate on day view.
6. **Visual testing** — verify at 320px, 768px, 1200px. Check dark mode. Check empty day.

## Key Implementation Details

### Positioning Formula
```
position% = (timestamp - rangeStart) / (rangeEnd - rangeStart) * 100
width% = (durationSeconds * 1000) / (rangeEnd - rangeStart) * 100
```

### Category Colour Lookup
```
import { CATEGORY_DEFAULTS } from '~/utils/categoryDefaults'
const color = CATEGORY_DEFAULTS[entry.category]?.color ?? '#9CA3AF'
```

### Day View Gate
Both components should only render when the current zoom level is `day`. Check the existing zoom level state in `pages/index.vue`.

### Dot Threshold
If `!durationSeconds || durationSeconds < 300` (5 minutes), render as a 6px dot instead of a bar.

## Running Tests

```bash
# Unit tests (composable logic)
cd app && npx vitest run composables/useTimelinePosition

# All tests
cd app && npx vitest run

# E2E (visual verification)
cd app && npx playwright test
```

## Verification Checklist

- [ ] Entry at noon (12:00) appears at horizontal midpoint
- [ ] Entry at 6am appears at 25% from left
- [ ] 47-minute entry shows visible bar width
- [ ] 2-minute entry shows as dot
- [ ] Ta-da shows as dot at correct position
- [ ] Category colours match filter chip colours
- [ ] Empty day shows baseline line (no entries)
- [ ] Day strip hidden in week/month/year views
- [ ] Cards look correct at 320px width
- [ ] Dark mode renders correctly
