# Tasks: Daily Timeline Bar

**Input**: Design documents from `/specs/010-daily-timelines/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the directory structure and shared infrastructure

- [ ] T001 Create `app/components/timeline/` directory
- [ ] T002 Create `app/composables/useTimelinePosition.ts` — composable stub exporting `useTimelinePosition(rangeStart: Date, rangeEnd: Date)` with `getPosition()`, `getWidth()`, `isDot()` functions returning placeholder values

**Checkpoint**: Directory structure exists, composable file is importable

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core positioning logic that BOTH user stories depend on

- [ ] T003 Implement `useTimelinePosition` composable in `app/composables/useTimelinePosition.ts`:
  - `getPosition(timestamp: string): number` — returns 0-100% position within range
  - `getWidth(durationSeconds: number): number` — returns 0-100% width, minimum 0.5%
  - `isDot(type: string, durationSeconds?: number | null): boolean` — true for instant types or duration < 300s
  - `getColor(category?: string | null): string` — category colour lookup from `categoryDefaults.ts`, fallback `#9CA3AF`
  - Accept `rangeStart` and `rangeEnd` as Date params (future-proofed for week/month/year)
  - Handle midnight clipping: `effectiveEnd = min(entryEnd, rangeEnd)`
- [ ] T004 Write unit tests for `useTimelinePosition` in `app/composables/useTimelinePosition.test.ts`:
  - Test noon (12:00) returns ~50%
  - Test 6am returns ~25%
  - Test duration width for 47 minutes
  - Test sub-5-minute entry returns isDot = true
  - Test ta-da/moment/tally types return isDot = true
  - Test timed/exercise types with duration >= 300s return isDot = false
  - Test missing category returns fallback colour
  - Test midnight clipping (entry spanning past rangeEnd)
  - Test 0-second duration returns isDot = true

**Checkpoint**: Positioning logic fully tested. All subsequent components depend on this.

---

## Phase 3: User Story 1 — Per-Card Time Indicator (Priority: P1)

**Goal**: Each activity card in day view shows a subtle 24-hour timeline with the entry's position marked

**Independent Test**: Open day view with entries at various times; verify each card shows a correctly positioned, category-coloured indicator

### Implementation for User Story 1

- [ ] T005 [US1] Create `app/components/timeline/CardTimeIndicator.vue`:
  - Props: `entry` (object with timestamp, durationSeconds, category, type), `rangeStart: Date`, `rangeEnd: Date`
  - Render a thin horizontal line (full width, subtle `stone-200`/`dark:stone-600` colour)
  - If `isDot`: render a 6px coloured dot at `getPosition()%`
  - If bar: render a coloured bar at `getPosition()%` left, `getWidth()%` width
  - Bar opacity: full (1.0) — per-card has no overlap
  - Use `position: relative` container with `position: absolute` children
  - Tailwind for baseline styling, inline style for dynamic `left`/`width` percentages
- [ ] T006 [US1] Integrate `CardTimeIndicator` into `app/components/VirtualTimeline.vue`:
  - Import `CardTimeIndicator` component
  - Add it inside the entry card template (after the content div, before the card closing div, around line ~440)
  - Compute `rangeStart`/`rangeEnd` for the displayed day (midnight to midnight)
  - Only render when zoom level is `day` (check existing zoom state in parent)
  - Pass entry data as props
- [ ] T007 [US1] Visual verification of per-card indicator:
  - Verify timed entry shows coloured bar at correct position
  - Verify ta-da shows dot marker
  - Verify moment/tally show dot markers
  - Verify sub-5-minute timed entry shows dot
  - Verify different categories show different colours
  - Verify indicator hidden in week/month/year views
  - Verify 320px mobile width renders correctly

**Checkpoint**: Per-card indicators visible on all day view cards. Story 1 is independently complete and testable.

---

## Phase 4: User Story 2 — Combined Day Strip (Priority: P1)

**Goal**: A single timeline bar above all cards showing every activity for the day overlaid on one 24-hour line

**Independent Test**: Open day view with multiple entries spread across the day; verify all appear on a single strip above the cards

### Implementation for User Story 2

- [ ] T008 [US2] Create `app/components/timeline/TimelineStrip.vue`:
  - Props: `entries` (array of entry objects), `rangeStart: Date`, `rangeEnd: Date`
  - Render a horizontal container (2-3x taller than CardTimeIndicator, e.g., 12-16px height)
  - Baseline: full-width subtle line (`stone-200`/`dark:stone-600`)
  - For each entry: compute `TimelineEntry` (position, width, isDot, color) using `useTimelinePosition`
  - Timed bars: `position: absolute`, `left: X%`, `width: Y%`, `opacity: 0.7`, `background: color`
  - Dots: `position: absolute`, `left: X%`, 6px circle, full opacity, `background: color`
  - Overlap handling for bars: semi-transparency (opacity 0.7) allows layered colours to show through
  - Overlap handling for dots: z-ordering via DOM order (later entries on top)
  - Empty state: render baseline line even with zero entries
- [ ] T009 [US2] Integrate `TimelineStrip` into `app/pages/index.vue`:
  - Import `TimelineStrip` component
  - Place it above the `VirtualTimeline` component in the day view layout
  - Compute `rangeStart`/`rangeEnd` for the displayed day
  - Pass the day's entries array as prop
  - Only render when zoom level is `day`
  - Ensure it sits below any daily summary and above the card list
- [ ] T010 [US2] Visual verification of day strip:
  - Verify all entries appear at correct positions
  - Verify overlapping timed entries layer with transparency
  - Verify overlapping dots use z-ordering
  - Verify empty day shows baseline line
  - Verify strip hidden in week/month/year views
  - Verify 320px mobile width renders correctly
  - Verify 20+ entries render without layout breakage

**Checkpoint**: Day strip visible above cards in day view. Stories 1 AND 2 are independently complete.

---

## Phase 5: User Story 3 — Category Colour Consistency (Priority: P2)

**Goal**: Category colours match across card indicators, day strip, and existing UI (filter chips)

**Independent Test**: Compare colours on card indicator, day strip, and category filter chip for the same category

### Implementation for User Story 3

- [ ] T011 [US3] Audit colour consistency across all timeline components:
  - Verify `CardTimeIndicator` and `TimelineStrip` both use `getColor()` from `useTimelinePosition`
  - Verify `getColor()` sources from `CATEGORY_DEFAULTS` in `app/utils/categoryDefaults.ts` (same source as `TimelineHeader.vue` filter chips)
  - Verify fallback colour `#9CA3AF` renders for entries with no/unknown category
  - If any divergence found, fix in the composable to ensure single source of truth
- [ ] T012 [US3] Test all 10 categories render with distinguishable colours on the day strip

**Checkpoint**: Colours are consistent across all surfaces.

---

## Phase 6: User Story 4 — Responsive Display (Priority: P2)

**Goal**: Timeline renders correctly from 320px mobile to wide desktop

**Independent Test**: View day view at 320px, 768px, and 1200px widths

### Implementation for User Story 4

- [ ] T013 [US4] Test and fix responsive rendering in `CardTimeIndicator.vue`:
  - Verify at 320px: indicator visible, bars/dots positioned correctly
  - Verify sub-5-minute entries show as dots (not sub-pixel slivers) at all widths
  - Verify no horizontal overflow from the card boundary
- [ ] T014 [P] [US4] Test and fix responsive rendering in `TimelineStrip.vue`:
  - Verify at 320px: strip spans full width
  - Verify emoji markers overlap freely (no clipping or hiding)
  - Verify at 1200px: fine-grained detail is visible
  - Ensure no fixed pixel widths that would break at narrow viewports
- [ ] T015 [US4] Test dark mode rendering for both components:
  - Verify baseline line uses `stone-200` (light) / `stone-600` (dark)
  - Verify category colours have sufficient contrast against `stone-800` dark background

**Checkpoint**: All responsive and dark mode scenarios verified.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Final quality pass across all components

- [ ] T016 [P] Verify day view zoom gating — switch between day/week/month/year and confirm timeline elements appear only in day view
- [ ] T017 [P] Performance sanity check — scroll through a day with 50+ entries in VirtualTimeline; confirm no jank or FPS drop
- [ ] T018 Run existing test suite (`npx vitest run`) to ensure no regressions
- [ ] T019 Run quickstart.md verification checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)** and **US2 (Phase 4)**: Both depend on Phase 2; can run in parallel
- **US3 (Phase 5)**: Depends on Phase 3 AND Phase 4 (needs both components to exist)
- **US4 (Phase 6)**: Depends on Phase 3 AND Phase 4
- **Polish (Phase 7)**: Depends on all stories complete

### Parallel Opportunities

```
Phase 2 complete
    ├── Phase 3 (US1: CardTimeIndicator)  ──┐
    │                                        ├── Phase 5 (US3: Colour audit)
    └── Phase 4 (US2: TimelineStrip)  ──────┤
                                             ├── Phase 6 (US4: Responsive)
                                             └── Phase 7 (Polish)
```

- **T005 + T008** can run in parallel (different component files)
- **T013 + T014** can run in parallel (different component files)
- **T016 + T017** can run in parallel (independent checks)

### Within Each Story

- Component creation before integration into existing pages
- Integration before visual verification

---

## Implementation Strategy

### MVP (Stories 1 + 2 Only)

1. Complete Phase 1 + 2 (setup + composable)
2. Complete Phase 3 (per-card indicator) — **validate independently**
3. Complete Phase 4 (day strip) — **validate independently**
4. Ship. Stories 3 + 4 are quality refinement.

### Recommended Order (Single Developer)

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019

---

## Notes

- No backend tasks — this is entirely frontend
- No database migrations
- No new dependencies to install
- 19 total tasks, 4 user stories
- MVP scope: 10 tasks (Phase 1-4, T001-T010)
- Parallel opportunities: 3 pairs identified
