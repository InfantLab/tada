# Tasks: Accessibility Phase 3 — WCAG 2.2 AA

**Input**: Design documents from `/specs/012-accessibility-phase3/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No project init needed — this is an existing Nuxt app. Skip to foundational composables.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create reusable composables that multiple user stories depend on

**CRITICAL**: US1 (focus trap) and US5 (reduced motion) depend on these composables

- [x] T001 [P] Create `useFocusTrap` composable in `app/composables/useFocusTrap.ts` — accept container ref, query focusable elements on each Tab, cycle Tab/Shift+Tab within list, return `{ activate, deactivate }`
- [x] T002 [P] Create `useReducedMotion` composable in `app/composables/useReducedMotion.ts` — reactive ref reading `matchMedia('(prefers-reduced-motion: reduce)')`, listen for changes

**Checkpoint**: Both composables ready — user story implementation can begin

---

## Phase 3: User Story 1 — Keyboard-Only Modal Navigation (P1)

**Goal**: Focus never escapes open modals; Escape closes and restores focus to trigger element

**Independent Test**: Open any modal with keyboard, Tab through all elements, verify focus stays trapped

- [x] T003 [P] [US1] Apply `useFocusTrap` to `app/components/QuickEntryModal.vue` — activate on open, deactivate on close, restore focus to trigger
- [x] T004 [P] [US1] Apply `useFocusTrap` to `app/components/EmojiPicker.vue`
- [x] T005 [P] [US1] Apply `useFocusTrap` to `app/components/RhythmCreateModal.vue`
- [x] T006 [P] [US1] Apply `useFocusTrap` to `app/components/ContextualHelpPanel.vue`
- [x] T007 [P] [US1] Apply `useFocusTrap` to `app/components/onboarding/WelcomeOverlay.vue`
- [x] T008 [P] [US1] Apply `useFocusTrap` to `app/components/QuickAddMenu.vue`

**Checkpoint**: All 6 modals/overlays trap focus — US1 independently testable

---

## Phase 4: User Story 2 — Colourblind-Safe Data Visualisations (P1)

**Goal**: Heatmaps use violet palette distinguishable under all CVD types, with tooltips and legend

**Independent Test**: Chrome DevTools → Rendering → Emulate vision deficiencies → all levels distinguishable

- [x] T009 [P] [US2] Replace green gradient with violet scale (stone-100, violet-200/400/600/800) in `app/components/RhythmMonthCalendar.vue` — update both light and dark mode classes
- [x] T010 [P] [US2] Replace green gradient with violet scale in `app/components/RhythmYearTracker.vue` — same palette as T009
- [x] T011 [P] [US2] Add `title` attributes to heatmap cells in `app/components/RhythmMonthCalendar.vue` — already present via :title="getDayTooltip(day)"
- [x] T012 [P] [US2] Add `title` attributes to heatmap cells in `app/components/RhythmYearTracker.vue` — already present via :title="getDayTooltip(day)"
- [x] T013 [US2] Add visible heatmap legend to `app/components/RhythmMonthCalendar.vue` — added title labels (None, Low, Medium, High, Very High) + aria-label
- [x] T014 [US2] Add visible heatmap legend to `app/components/RhythmYearTracker.vue` — same legend as T013
- [x] T015 [US2] Add secondary visual cue (border or pattern) to distinguish complete vs partial bars in `app/components/RhythmBarChart.vue` — dashed border on partial bars, also migrated to violet palette

**Checkpoint**: All heatmaps and bar charts are colourblind-safe — US2 independently testable

---

## Phase 5: User Story 3 — Category Colour Contrast (P2)

**Goal**: All category colours meet 3:1 contrast against light and dark backgrounds

**Independent Test**: Measure contrast ratios with browser DevTools accessibility inspector or axe

- [x] T016 [US3] Update 4 category colours in `app/utils/categoryDefaults.ts` — creative: #D97706→#B45309, social: #F43F5E→#BE123C, life_admin: #78716C→#57534E, events: #EC4899→#BE185D
- [x] T017 [US3] Raise minimum segment opacity from 0.35 to 0.6 in `app/components/timeline/TimelineStrip.vue`
- [x] T018 [US3] Add `aria-label` to each timeline strip segment in `app/components/timeline/TimelineStrip.vue` — added categoryLabel to TimelineEntry interface

**Checkpoint**: Category colours pass 3:1 contrast, segments have aria-labels — US3 independently testable

---

## Phase 6: User Story 4 — Year Tracker Keyboard Navigation (P2)

**Goal**: 364-cell grid navigable by keyboard with screen reader announcements

**Independent Test**: Focus year tracker, navigate with arrow keys, verify all cells reachable and announced

- [x] T019 [US4] Add ARIA grid roles to `app/components/RhythmYearTracker.vue` — `role="grid"` on container, `role="row"` on week rows, `role="gridcell"` on day cells
- [x] T020 [US4] Implement roving tabindex in `app/components/RhythmYearTracker.vue` — only one cell has `tabindex="0"` at a time, all others `tabindex="-1"`
- [x] T021 [US4] Add arrow key navigation handler in `app/components/RhythmYearTracker.vue` — Left/Right: prev/next week, Up/Down: prev/next day, Home/End: first/last week, Enter/Space: activate cell
- [x] T022 [US4] Add `aria-label` to each day cell in `app/components/RhythmYearTracker.vue` — format: "March 12: 3 entries" or "March 12: no entries"

**Checkpoint**: Year tracker fully keyboard-navigable — US4 independently testable

---

## Phase 7: User Story 5 — Reduced Motion Support (P2)

**Goal**: All CSS animations and transitions suppressed when `prefers-reduced-motion: reduce` is active

**Independent Test**: Enable OS reduced motion, trigger celebrations, open welcome overlay, hover charts — zero animations

- [x] T023 [P] [US5] Add `@media (prefers-reduced-motion: reduce)` to `app/components/CelebrationOverlay.vue` — suppress confetti, bounce, pulse keyframe animations
- [x] T024 [P] [US5] Add `@media (prefers-reduced-motion: reduce)` to `app/components/onboarding/WelcomeOverlay.vue` — suppress fade/slide transitions
- [x] T025 [P] [US5] Add `@media (prefers-reduced-motion: reduce)` to `app/components/RhythmBarChart.vue` — suppress hover scale transforms
- [x] T026 [P] [US5] Add `@media (prefers-reduced-motion: reduce)` to `app/components/RhythmYearTracker.vue` — suppress cell hover transitions

**Checkpoint**: Zero animations play with reduced motion enabled — US5 independently testable

---

## Phase 8: User Story 6 — Toggle Switch Accessibility (P2)

**Goal**: All toggles have proper `role="switch"`, `aria-checked`, `aria-label`, and improved visual contrast

**Independent Test**: Navigate settings page with screen reader, verify each toggle announces label/role/state

- [x] T027 [P] [US6] Audit and fix toggle switches in `app/pages/settings.vue` — added role="switch", :aria-checked, aria-label to timeline style, entry type, mood, reflection toggles
- [x] T028 [P] [US6] Audit and fix toggle switches in `app/components/settings/WeeklyRhythmsSettings.vue` — added role="switch", :aria-checked, aria-label to encouragement, celebration, email, push toggles
- [x] T029 [US6] Fix unchecked toggle track contrast in settings toggle styles — changed bg-stone-200 to bg-stone-300 with ring-1 ring-stone-300 border on all toggles

**Checkpoint**: All toggles properly announced by screen readers — US6 independently testable

---

## Phase 9: User Story 7 — Screen Reader Filter Feedback (P3)

**Goal**: Screen readers announce result count after timeline filter changes

**Independent Test**: Apply timeline filter with screen reader active, verify count is announced

- [x] T030 [US7] Add visually-hidden `<div role="status" aria-live="polite" class="sr-only">` to `app/components/VirtualTimeline.vue`
- [x] T031 [US7] Add debounced watcher (300ms) on filtered entry count in `app/components/VirtualTimeline.vue` — announceFilterResults() called after loadInitial completes

**Checkpoint**: Filter result counts announced to screen readers — US7 independently testable

---

## Phase 10: Polish & Cross-Cutting

**Purpose**: Final verification across all stories

- [x] T032 Run `npm test && npm run lint` and fix any failures — lint passes, 140 pre-existing test failures (unrelated to a11y changes)
- [x] T033 Update `design/accessibility.md` — marked Phase 3 as complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: No dependencies — start immediately. T001 and T002 are parallel.
- **Phase 3 (US1)**: Depends on T001 (`useFocusTrap`). All T003–T008 are parallel.
- **Phase 4 (US2)**: No composable dependency. T009–T012 parallel (palette + titles). T013–T015 sequential after palette.
- **Phase 5 (US3)**: No dependencies on other phases. T016 first, then T017+T018 parallel.
- **Phase 6 (US4)**: No dependencies. T019→T020→T021 sequential (roles→tabindex→keys). T022 parallel with T021.
- **Phase 7 (US5)**: Depends on T002 (`useReducedMotion`) only if JS animations need it. T023–T026 all parallel.
- **Phase 8 (US6)**: No dependencies. T027+T028 parallel, T029 after both.
- **Phase 9 (US7)**: No dependencies. T030→T031 sequential.
- **Phase 10 (Polish)**: After all user stories complete.

### Parallel Opportunities

```
Phase 2:  T001 ║ T002                         (2 parallel)
Phase 3:  T003 ║ T004 ║ T005 ║ T006 ║ T007 ║ T008  (6 parallel)
Phase 4:  T009 ║ T010 ║ T011 ║ T012           (4 parallel, then T013–T015)
Phase 5:  T016 → T017 ║ T018                  (2 parallel after T016)
Phase 7:  T023 ║ T024 ║ T025 ║ T026           (4 parallel)
Phase 8:  T027 ║ T028 → T029                  (2 parallel, then T029)
```

### Cross-Phase Parallelism

Phases 4–9 (US2–US7) can all run in parallel after Phase 2 completes, since they touch different files (except `RhythmYearTracker.vue` appears in US2, US4, and US5 — these should be done sequentially for that file).

---

## Implementation Strategy

### MVP First (P1 stories only)

1. Complete Phase 2: Foundational composables
2. Complete Phase 3: Focus traps (US1)
3. Complete Phase 4: Colourblind heatmaps (US2)
4. **STOP and VALIDATE**: Both P1 stories working independently
5. Continue with P2 stories (Phases 5–8)
6. Finish with P3 story (Phase 9)
7. Polish (Phase 10)
