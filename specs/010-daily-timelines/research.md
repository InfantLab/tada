# Research: Daily Timeline Bar

**Feature**: 010-daily-timelines | **Date**: 2026-03-22

## Research Tasks

### R1: Rendering Approach — CSS vs SVG

**Decision**: Use CSS `position: absolute` with percentage-based `left` and `width` inside a `position: relative` container.

**Rationale**: CSS absolute positioning is the simplest approach for horizontal bar placement. No SVG viewBox calculations needed. Tailwind utility classes can handle most styling. SVG would add complexity without benefit for simple rectangles and dots.

**Alternatives Considered**:
- **SVG**: More precise for complex shapes, but overkill for rectangles and circles. Would need viewBox management and wouldn't benefit from Tailwind.
- **Canvas**: Maximum render performance, but loses DOM accessibility, can't use CSS styling, and is harder to debug. Completely unnecessary for this scale (<100 elements).

### R2: Integration with VirtualTimeline's Virtualised Scroll

**Decision**: The per-card indicator is rendered inside each card's template in VirtualTimeline.vue. The day strip is a separate component placed above the virtualised list.

**Rationale**: VirtualTimeline uses `vue-virtual-scroller` which manages DOM recycling. The per-card indicator must be part of the card template so it's created/destroyed with the card. The day strip sits outside the virtualised list entirely — it's a fixed element above the scroll area.

**Risk**: None. The card indicator adds minimal DOM (one `div` container + one `div` bar/dot per card). The day strip is a single component rendered once.

### R3: Overlap Handling Strategy

**Decision**: Semi-transparent layering for timed bars (CSS `opacity: 0.6`), z-ordering for emoji markers.

**Rationale**: Transparency allows both overlapping bars to be visible without growing the strip height. If this proves visually confusing in practice (user feedback indicated concern about colour cue degradation), the fallback is vertical stacking via CSS flexbox column direction. Emoji markers are discrete elements and z-ordering (via DOM order or `z-index`) is simpler and clearer than transparency for non-rectangular elements.

**Implementation Note**: Start with `opacity: 0.7` for bars on the day strip. Adjust based on visual testing. Per-card indicators never overlap (one entry per card).

### R4: Category Colour Access Pattern

**Decision**: Import `CATEGORY_DEFAULTS` from `categoryDefaults.ts` and look up `entry.category`.

**Rationale**: The existing `getCategoryInfo()` helper already resolves category to `{ color, emoji, label }`. The colour is a hex string (e.g., `#7C3AED`). This is the same pattern used by `TimelineHeader.vue` for category filter chips.

**Fallback colour**: `#9CA3AF` (Tailwind `gray-400`) for entries with no category or unrecognised category.

### R5: Minimum Bar Width and Dot Threshold

**Decision**: Entries with duration < 5 minutes (< 0.35% of 24h) render as a 6px-wide dot. Bars have a minimum width of `max(calculated%, 0.5%)`.

**Rationale**: At 320px viewport, 0.35% = ~1.1px — invisible. A 6px dot is the smallest clearly visible marker. The 0.5% minimum width (~1.6px at 320px, ~7px at 1440px) ensures bars are always clickable-sized for future interactivity.

### R6: Future-Proofing for Other Zoom Levels

**Decision**: Extract positioning logic into `useTimelinePosition` composable that accepts `rangeStart` and `rangeEnd` timestamps.

**Rationale**: For day view, range is midnight-to-midnight. For week, it's Monday 00:00 to Sunday 23:59. The percentage calculation `(timestamp - rangeStart) / (rangeEnd - rangeStart) * 100` is identical regardless of zoom level. Extracting this now means week/month/year strips require zero changes to the positioning logic — only a different range input.

**Interface sketch**:
```typescript
function useTimelinePosition(rangeStart: Date, rangeEnd: Date) {
  function getPosition(timestamp: string): number // 0-100%
  function getWidth(durationSeconds: number): number // 0-100%
  function isDot(durationSeconds: number | undefined): boolean
}
```

### R7: Dark Mode Compatibility

**Decision**: Timeline line uses `stone-200` (light) / `stone-600` (dark). Bars use category colours at specified opacity. Dots use category colours at full opacity.

**Rationale**: The app already supports dark mode (cards use `dark:bg-stone-800`). The timeline baseline needs to be visible but subtle in both themes. Category hex colours have sufficient contrast against both `white` and `stone-800` backgrounds based on the existing palette.

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `categoryDefaults.ts` | Exists | Read-only. Provides `CATEGORY_DEFAULTS` with `.color` hex values |
| `VirtualTimeline.vue` | Exists | Card template at lines 363-443. Will be modified to include per-card indicator |
| `pages/index.vue` | Exists | Day view layout. Day strip will be added above the VirtualTimeline component |
| `vue-virtual-scroller` | Exists | Virtualisation library. No changes needed. |
| Tailwind CSS | Exists | Used for all styling |

## Open Questions

None. All research questions resolved.
