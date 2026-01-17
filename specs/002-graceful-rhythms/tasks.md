# Tasks: Graceful Rhythm Chains

**Input**: Design documents from `/specs/002-graceful-rhythms/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- All paths relative to `app/`

---

## Phase 1: Setup

**Purpose**: Database schema changes and core utilities

- [x] T001 Add `durationThresholdSeconds` and `panelPreferences` columns to rhythms table in server/db/schema.ts
- [x] T002 Create `encouragements` table in server/db/schema.ts
- [x] T003 Generate database migration with `bun run db:generate`
- [x] T004 [P] Create encouragements seed script in scripts/seed-encouragements.mjs
- [x] T005 [P] Create tier types and constants in utils/tierCalculator.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core calculation logic that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement `getTierForDaysCompleted()` function in utils/tierCalculator.ts
- [x] T007 Implement `calculateWeeklyProgress()` function in utils/tierCalculator.ts
- [x] T008 [P] Write unit tests for tier calculator in utils/tierCalculator.test.ts
- [x] T009 Implement `calculateChainStats()` function in server/utils/rhythmCalculator.ts
- [x] T010 Implement `selectEncouragement()` function in server/utils/rhythmCalculator.ts
- [x] T011 [P] Create useRhythms composable skeleton in composables/useRhythms.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create Timer-Based Rhythm (Priority: P1) 🎯 MVP

**Goal**: Users can create rhythms with duration thresholds and frequency targets

**Independent Test**: Create a rhythm, see it on the rhythms page with correct settings

### Implementation for US1

- [x] T012 [US1] Implement POST /api/rhythms endpoint in server/api/rhythms/index.post.ts
- [x] T013 [US1] Implement GET /api/rhythms endpoint in server/api/rhythms/index.get.ts
- [x] T014 [P] [US1] Create RhythmCreateModal component in components/RhythmCreateModal.vue
- [x] T015 [US1] Add rhythm creation flow to pages/rhythms.vue
- [x] T016 [US1] Wire useRhythms composable to fetch and create rhythms

**Checkpoint**: Can create a rhythm and see it listed

---

## Phase 4: User Story 2 - Graceful Tier Display (Priority: P1) 🎯 MVP

**Goal**: Show achieved tier positively, never "broken streak" messaging

**Independent Test**: View rhythm with partial week completion, see encouraging tier feedback

### Implementation for US2

- [x] T017 [US2] Implement GET /api/rhythms/:id/progress endpoint in server/api/rhythms/[id]/progress.get.ts
- [x] T018 [P] [US2] Create RhythmChainStats component in components/RhythmChainStats.vue
- [x] T019 [US2] Add progress fetching to useRhythms composable
- [x] T020 [US2] Display current tier and chain stats in rhythm panel on pages/rhythms.vue

**Checkpoint**: MVP complete - can create rhythm and see graceful tier display

---

## Phase 5: User Story 3 - Identity-Based Encouragement (Priority: P2)

**Goal**: Show varied identity-focused messages alongside statistics

**Independent Test**: View rhythm stats, see varied encouragement messages

### Implementation for US3

- [x] T021 [US3] Run encouragements seed script to populate database
- [x] T022 [P] [US3] Create RhythmEncouragement component in components/RhythmEncouragement.vue
- [x] T023 [US3] Add encouragement selection to progress API response
- [x] T024 [US3] Display encouragement and totals in rhythm panel

**Checkpoint**: Rhythm panels show identity-based encouragement with statistics

---

## Phase 6: User Story 4 - Mid-Week Nudge (Priority: P2)

**Goal**: Show gentle guidance on what's needed to achieve tiers

**Independent Test**: View rhythm mid-week behind target, see actionable nudge

### Implementation for US4

- [x] T025 [US4] Add nudge message calculation to progress API
- [x] T026 [US4] Display nudge message in RhythmChainStats when applicable

**Checkpoint**: Mid-week guidance appears when user is behind target

---

## Phase 7: User Story 5 - Year and Month Visualizations (Priority: P2)

**Goal**: GitHub-style year tracker and calendar month view

**Independent Test**: View rhythm panel, see year heatmap and month calendar

### Implementation for US5

- [x] T027 [P] [US5] Create RhythmYearTracker component in components/RhythmYearTracker.vue
- [x] T028 [P] [US5] Create RhythmMonthCalendar component in components/RhythmMonthCalendar.vue
- [x] T029 [US5] Add day-by-day data to progress API response
- [x] T030 [US5] Integrate visualizations into rhythm panel on pages/rhythms.vue

**Checkpoint**: Rhythm panels show year tracker and month calendar

---

## Phase 8: User Story 6 - Chain Statistics (Priority: P2)

**Goal**: Show current and longest chains per tier

**Independent Test**: View chain stats showing current prominently, longest subtly

### Implementation for US6

- [x] T031 [US6] Add per-tier chain calculation to rhythmCalculator.ts
- [x] T032 [US6] Enhance RhythmChainStats to show all tiers with current/longest

**Checkpoint**: Chain statistics display for all tiers

---

## Phase 9: User Story 7 - Accordion Collapse (Priority: P2)

**Goal**: Multiple rhythms with collapsible panels

**Independent Test**: Create multiple rhythms, collapse/expand, see summary headers

### Implementation for US7

- [x] T033 [P] [US7] Create RhythmPanel accordion component in components/RhythmPanel.vue
- [x] T034 [US7] Refactor pages/rhythms.vue to use RhythmPanel for each rhythm
- [x] T035 [US7] Add collapsed state with summary (name, tier, chain length)

**Checkpoint**: Multiple rhythms display in accordion with collapse/expand

---

## Phase 10: User Story 8 - Edit and Delete Rhythms (Priority: P3)

**Goal**: Users can modify or remove rhythms

**Independent Test**: Edit rhythm settings, delete rhythm, entries preserved

### Implementation for US8

- [x] T036 [US8] Implement GET /api/rhythms/:id endpoint in server/api/rhythms/[id].get.ts
- [x] T037 [US8] Implement PUT /api/rhythms/:id endpoint in server/api/rhythms/[id].put.ts
- [x] T038 [US8] Implement DELETE /api/rhythms/:id endpoint in server/api/rhythms/[id].delete.ts
- [x] T039 [US8] Add edit mode to RhythmCreateModal component
- [x] T040 [US8] Add delete confirmation and action to rhythm panel

**Checkpoint**: Can edit and delete rhythms

---

## Phase 11: User Story 9 - Responsive Layout (Priority: P3)

**Goal**: Mobile-first layout that works well on desktop

**Independent Test**: View rhythms page on mobile and desktop viewports

### Implementation for US9

- [x] T041 [US9] Add responsive breakpoints to RhythmPanel (stack vs side-by-side)
- [x] T042 [US9] Optimize RhythmYearTracker for mobile (horizontal scroll or simplified)
- [x] T043 [US9] Ensure touch targets are 44px minimum on mobile
- [x] T044 [US9] Test and adjust collapsed panel density on desktop

**Checkpoint**: Layout works well on mobile and desktop

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and verification

- [x] T045 [P] Add loading states to all rhythm components
- [x] T046 [P] Add error handling for API failures
- [x] T047 Run quickstart.md verification checklist
- [ ] T048 Manual testing on mobile device

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────────────────────────────────────────────────────────────►
              └──► Phase 2 (Foundational) ────────────────────────────────────►
                                         └──► Phase 3 (US1) ──► Phase 4 (US2) ──► MVP ✅
                                                              └──► Phase 5-9 (P2 stories) ──►
                                                                                            └──► Phase 10-11 (P3)
                                                                                                              └──► Phase 12 (Polish)
```

### User Story Dependencies

| Story | Depends On                   | Can Parallel With |
| ----- | ---------------------------- | ----------------- |
| US1   | Phase 2                      | -                 |
| US2   | US1 (needs rhythms to exist) | -                 |
| US3   | US2 (needs progress API)     | US4, US5, US6     |
| US4   | US2                          | US3, US5, US6     |
| US5   | US2                          | US3, US4, US6     |
| US6   | US2                          | US3, US4, US5     |
| US7   | US2                          | US3-US6           |
| US8   | US1                          | US3-US7           |
| US9   | US5, US7                     | -                 |

### Parallel Opportunities

**Within Phase 1:**

```
T004 (seed script) ──┬── can run in parallel
T005 (tier types)  ──┘
```

**Within Phase 2:**

```
T008 (tier tests) ──┬── can run in parallel
T011 (composable) ──┘
```

**P2 Stories (after MVP):**

```
US3 (encouragement) ──┬── can run in parallel
US4 (nudge)         ──┤
US5 (visualizations)──┤
US6 (chain stats)   ──┘
```

---

## Summary

| Phase | Tasks         | Purpose                     |
| ----- | ------------- | --------------------------- |
| 1     | T001-T005 (5) | Setup - schema, seed, types |
| 2     | T006-T011 (6) | Foundational - calculators  |
| 3     | T012-T016 (5) | US1 - Create rhythm         |
| 4     | T017-T020 (4) | US2 - Graceful tiers        |
| 5     | T021-T024 (4) | US3 - Encouragement         |
| 6     | T025-T026 (2) | US4 - Mid-week nudge        |
| 7     | T027-T030 (4) | US5 - Visualizations        |
| 8     | T031-T032 (2) | US6 - Chain stats           |
| 9     | T033-T035 (3) | US7 - Accordion             |
| 10    | T036-T040 (5) | US8 - Edit/delete           |
| 11    | T041-T044 (4) | US9 - Responsive            |
| 12    | T045-T048 (4) | Polish                      |

**Total**: 48 tasks across 12 phases

**MVP Scope**: Phases 1-4 (20 tasks) - Create rhythm + Graceful tier display
