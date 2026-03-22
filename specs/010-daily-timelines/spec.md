# Feature Specification: Daily Timeline Bar

**Feature Branch**: `010-daily-timelines`
**Created**: 2026-03-22
**Status**: Draft
**Input**: A minimalistic 24-hour timeline visualisation showing when activities happened during the day. Two components: per-card time indicators on each activity card in day view, and a combined day strip above all cards showing the full day at a glance. Purely presentational, using existing entry data (timestamp, duration, category, type).

## Scope

### This Version

- Per-card timeline indicator on each activity card in day view
- Combined day strip above the card list in day view
- Category colour coding using existing palette
- Static, non-interactive display
- Responsive layout (320px+ mobile widths)

### Future Versions (Out of Scope)

- Tap-to-scroll from day strip to corresponding card
- Tooltip on hover showing entry name and time
- User setting to show/hide timelines
- Sleep/wake indicators
- Timeline strip at other zoom levels (week strip, month strip, year strip) — the positioning model and visual treatment are designed to generalise; only the time range denominator changes

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a Per-Card Time Indicator on Each Activity (Priority: P1)

A user opens the day view and sees their activity cards, each with a subtle horizontal line representing 24 hours. Each entry's position on the line shows when it happened during the day. For timed entries (meditation, practice, exercise), a coloured bar spans the duration. For instant entries (ta-das, moments, tallies), a small marker sits at the logged timestamp. The colour matches the entry's category. No labels, no numbers — position alone conveys when in the day the activity occurred.

**Why this priority**: The per-card indicator is the foundational visual element. It introduces the 24-hour timeline concept on individual cards, is self-contained within the existing card component, and delivers value independently. A user can glance at any card and instantly see when in their day it happened.

**Independent Test**: Can be fully tested by opening day view with entries of various types and times, and verifying each card displays a correctly positioned, category-coloured indicator on a 24-hour line.

**Acceptance Scenarios**:

1. **Given** I am viewing the day view with a timed entry (e.g., 47-minute meditation starting at 7:15am), **When** I look at that card, **Then** I see a coloured bar starting at approximately 30% from the left (7:15/24h) with a width proportional to 47 minutes
2. **Given** I have a ta-da logged at 3:20pm, **When** I look at that card, **Then** I see a small marker (dot or lightning bolt icon) at approximately 64% from the left (15:33/24h)
3. **Given** I have a moment logged at 11:00pm, **When** I look at that card, **Then** the marker appears near the right end of the line
4. **Given** I have a tally logged at 6:00am, **When** I look at that card, **Then** a dot marker appears near the left quarter of the line
5. **Given** I have a timed entry with duration under 5 minutes, **When** I look at that card, **Then** the indicator displays as a dot rather than an invisible sliver
6. **Given** I have entries from different categories (mindfulness, movement, creative), **When** I look at their cards, **Then** each indicator uses the colour associated with its category
7. **Given** I switch to week, month, or year view, **When** I look at entry cards, **Then** no per-card timeline indicators are displayed
8. **Given** I am on a narrow mobile screen (320px), **When** I view day view cards, **Then** the timeline indicator still renders and is visible, scaled to the card width

---

### User Story 2 - See a Combined Day Strip Showing All Activities (Priority: P1)

A user opens the day view and sees a single timeline bar above the card list showing ALL of that day's activities overlaid on one 24-hour line. Timed entries appear as coloured bars. Instant entries (ta-das, moments, tallies) appear as small markers. The strip provides an instant visual overview of the day's rhythm — busy periods, quiet stretches, clusters of activity — all at a glance.

**Why this priority**: The combined day strip is the headline visual — the "visual heartbeat of your day." It delivers the core value proposition of this feature: a single-glance understanding of the shape of your day. It complements the per-card indicators but provides unique overview value that no other view offers.

**Independent Test**: Can be fully tested by opening day view with multiple entries spread across the day, and verifying all entries appear correctly positioned and colour-coded on a single timeline bar above the cards.

**Acceptance Scenarios**:

1. **Given** I have 5 entries spread across the day (morning meditation, midday ta-da, afternoon run, evening ta-da, night piano practice), **When** I view the day strip, **Then** all 5 entries appear at their correct positions on a single 24-hour line
2. **Given** I have two overlapping timed entries (e.g., "walking" and "podcast" at the same time), **When** I view the day strip, **Then** both bars are visible — they layer with semi-transparency so both colours show through. If transparency proves visually confusing (breaks colour cues), fall back to vertical stacking.
3. **Given** I have two instant entries (e.g., two ta-das) logged at nearly the same time, **When** I view the day strip, **Then** their emoji markers use z-ordering (later entry on top) rather than transparency
3. **Given** I have a day with entries only in the morning (6am-9am), **When** I view the day strip, **Then** the morning portion is populated and the rest of the day is visually empty, clearly showing a "morning person" pattern
4. **Given** I have no entries for today, **When** I view the day strip, **Then** the strip still renders as an empty 24-hour line (not hidden)
5. **Given** the day strip is above the card list, **When** I view the day page, **Then** the strip appears below any daily summary and above the first entry card
6. **Given** I am on a narrow mobile screen, **When** I view the day strip, **Then** it spans the full available width, positions are approximate but the overall rhythm is still readable
7. **Given** entries of different categories, **When** I view the day strip, **Then** each entry's bar or marker uses its category colour, making it easy to distinguish activity types
8. **Given** I have a day with 20+ entries, **When** I view the day strip, **Then** all entries are rendered without excessive visual clutter — the strip remains readable

---

### User Story 3 - Category Colour Consistency Across Timelines (Priority: P2)

A user sees consistent category colours throughout the timeline visualisations and the rest of the app. Mindfulness entries are always the same colour on the card indicator, the day strip, and the category filter chips. Colours are defined once and shared everywhere.

**Why this priority**: Colour consistency is essential for the timeline to be intuitive. Without it, users cannot build spatial memory ("purple = mindfulness") and the feature loses its at-a-glance value.

**Independent Test**: Can be fully tested by comparing the colour of an entry's indicator on its card, its representation on the day strip, and the corresponding category filter chip — all should match.

**Acceptance Scenarios**:

1. **Given** a mindfulness entry, **When** I compare its colour on the card indicator, the day strip, and the category filter, **Then** all three use the same colour
2. **Given** entries across all 10 categories, **When** I view the day strip, **Then** each category is visually distinguishable by colour
3. **Given** an entry with no category assigned, **When** I view its timeline indicator, **Then** it renders in a neutral default colour (e.g., grey)

---

### User Story 4 - Responsive Display Across Screen Sizes (Priority: P2)

A user views the timeline on devices ranging from a 320px mobile phone to a wide desktop monitor. The percentage-based layout scales naturally. On very narrow screens, the per-card indicator may be optionally hidden if it becomes too cramped, but the day strip always remains visible.

**Why this priority**: Ta-Da! is used on mobile devices. The timeline must work at small widths or it fails the majority of usage contexts.

**Independent Test**: Can be fully tested by viewing the day view at 320px, 768px, and 1200px widths, verifying the timeline elements render correctly at each breakpoint.

**Acceptance Scenarios**:

1. **Given** a 320px viewport, **When** I view the day view, **Then** the day strip is visible and spans the full width
2. **Given** a 320px viewport with a short timed entry (5 minutes), **When** I view the card, **Then** it displays as a dot, not a sub-pixel sliver
3. **Given** a 1200px desktop viewport, **When** I view the day view, **Then** both per-card indicators and day strip render with clear visual detail
4. **Given** the per-card indicator is viewed on a 320px screen, **When** I look at entry cards, **Then** the per-card timeline indicator is still visible — percentage-based bars scale naturally at any width

---

### Edge Cases

- What if an entry has no timestamp? (Should not happen — timestamp is required in schema; skip rendering if somehow missing)
- What if an entry spans midnight (e.g., overnight meditation)? (Clip the bar at the end of the day — show only the portion within the displayed day)
- What if there are many overlapping entries at the same time? (Day strip must handle gracefully — stacking, layering, or a density indicator)
- What if a timed entry has a 0-second duration? (Treat as an instant entry — render as a dot)
- What if the day strip becomes extremely dense (50+ entries)? (Maintain readability — accept visual overlap, rely on colour differentiation)
- What if a category colour is very similar to the background? (Ensure minimum contrast for the timeline line and all markers/bars)
- What if an entry's category is custom or unrecognised? (Fall back to a neutral default colour)

## Requirements *(mandatory)*

### Functional Requirements

**Per-Card Timeline Indicator**:

- **FR-001**: System MUST display a horizontal 24-hour timeline indicator on each entry card in day view
- **FR-002**: System MUST position timed entry indicators as coloured bars starting at the entry's timestamp, with width proportional to the entry's duration
- **FR-003**: System MUST position instant entries (ta-das, moments, tallies) as small markers (dots) at the entry's timestamp
- **FR-004**: System MUST render entries with durations under 5 minutes as dots rather than sub-pixel bars
- **FR-005**: System MUST colour each indicator using the entry's category colour from the shared category palette
- **FR-006**: System MUST NOT display per-card timeline indicators in week, month, or year views

**Combined Day Strip**:

- **FR-007**: System MUST display a combined 24-hour timeline strip above the card list in day view
- **FR-008**: System MUST render ALL entries for the displayed day on the combined strip, overlaid on a single line
- **FR-009**: System MUST display timed entries as coloured bars and instant entries as dot markers on the day strip
- **FR-010**: System MUST handle overlapping timed entries using semi-transparent layering so both colours show through. If transparency degrades colour recognition, the system SHOULD fall back to vertical stacking (strip grows taller).
- **FR-010a**: System MUST handle overlapping emoji markers (instant entries) using z-ordering — later entries render on top
- **FR-011**: System MUST display the day strip below any daily summary area and above the entry card list
- **FR-012**: System MUST render an empty day strip (the baseline 24-hour line) even when no entries exist for the day
- **FR-013**: System MUST NOT display the combined day strip in week, month, or year views

**Category Colours**:

- **FR-014**: System MUST use the existing category colour palette defined in `categoryDefaults.ts` for all timeline elements
- **FR-015**: System MUST apply the same colour for a given category across per-card indicators, the day strip, and all other UI surfaces
- **FR-016**: System MUST render entries with no category or an unrecognised category using a neutral fallback colour

**Visual Treatment**:

- **FR-017**: The per-card indicator MUST be visually subtle — thin, near-background-level, like a watermark rather than a chart
- **FR-018**: The day strip MUST be slightly more prominent than per-card indicators (approximately 2-3x taller)
- **FR-019**: Neither the per-card indicator nor the day strip MUST display axis labels, tick marks, grid lines, or numeric values
- **FR-020**: All timeline elements MUST use percentage-based positioning relative to the displayed time range (for day view: `minuteOfDay / 1440 * 100%`). The positioning model SHOULD be generalised so that the same approach can represent a week, month, or year range in future zoom levels.

**Responsiveness**:

- **FR-021**: System MUST render timeline elements correctly on viewports as narrow as 320px
- **FR-022**: System MUST ensure the day strip remains visible on all supported screen widths
- **FR-023**: System MUST keep per-card indicators visible at all screen widths — percentage-based bars scale naturally
- **FR-023a**: System MUST allow emoji markers on the day strip to overlap freely on narrow screens — visual density is an honest representation of a busy day

**Interaction (V1)**:

- **FR-024**: Timeline elements MUST be static and non-interactive in V1 — no click, tap, hover, or scroll behaviours

### Key Entities

- **Timeline Position**: A computed value representing where within the displayed time range an entry falls, expressed as a percentage (0% = range start, 100% = range end). For day view: 0% = midnight, 50% = noon, 100% = midnight. The same concept applies to week/month/year ranges in future versions. Derived from `entry.timestamp` relative to the range boundaries.
- **Timeline Bar**: A visual element for timed entries, with a start position (from timestamp) and a width (from duration relative to the displayed range). Minimum display width enforced for short durations.
- **Timeline Marker**: A visual element for instant entries (ta-das, moments, tallies), displayed as a dot or icon at a single position.
- **Timeline Strip**: An aggregated view compositing all timeline bars and markers for a time range onto one shared line. In V1 this is a day strip (24 hours); the concept generalises to week/month/year strips.
- **Category Colour**: A hex colour value assigned to each entry category, sourced from the shared `categoryDefaults` palette.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every entry card in day view displays a correctly positioned timeline indicator matching the entry's timestamp and duration
- **SC-002**: The combined day strip renders all entries for the displayed day with correct positions and category colours
- **SC-003**: Timeline positions are accurate: an entry at noon appears at the horizontal midpoint; an entry at 6am appears at 25%
- **SC-004**: Category colours on timeline elements match the colours used elsewhere in the app (category chips, etc.)
- **SC-005**: Entries with durations under 5 minutes display as dots, not invisible slivers
- **SC-006**: Timeline renders correctly on viewports from 320px to 1440px+ without layout breakage
- **SC-007**: No axis labels, numbers, or grid lines appear on any timeline element
- **SC-008**: Timeline elements appear only in day view — switching to week/month/year view hides them completely
- **SC-009**: Page load and render performance is not noticeably degraded by the addition of timeline elements (no charting library added; pure CSS/SVG)
- **SC-010**: A user can glance at the day strip and immediately identify the general rhythm of their day (busy periods, quiet stretches) without reading any text

## Assumptions

- All required data already exists in the entry schema: `timestamp` (always present), `durationSeconds` (for timed entries), `category`, and `type`
- No new API endpoints or database changes are needed — this is purely a presentation feature
- The existing `categoryDefaults.ts` palette provides sufficient colour differentiation for timeline use
- Entries always have a valid `timestamp` in ISO 8601 format (enforced by schema validation)
- The day view groups entries by date, so the set of entries for "today" is already computed
- Pure CSS and/or inline SVG can achieve the required visual without introducing a charting library
- Percentage-based positioning scales naturally to any container width
- The existing `VirtualTimeline.vue` component and entry cards can be extended to include the per-card indicator
- The day strip can be added as a new component slotted above the entry list in the day view layout
