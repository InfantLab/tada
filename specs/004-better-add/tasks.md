# Tasks: Unified Entry System ("Better Add")

**Input**: Design documents from `/specs/004-better-add/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Project initialization and shared infrastructure

- [ ] T001 Create `app/utils/entrySchemas.ts` with EntryInput Zod schema from data-model.md
- [ ] T002 [P] Create `app/utils/durationParser.ts` with parseDuration/formatDuration utilities
- [ ] T003 [P] Create `app/utils/naturalLanguageParser.ts` stub for time/count extraction

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core engine that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create `app/server/services/entryEngine.ts` with validate() method
- [ ] T005 Create `app/server/services/conflictDetector.ts` with checkOverlap() method
- [ ] T006 [P] Add entry_drafts table migration in `app/server/db/schema.ts`
- [ ] T007 [P] Add activity_history table migration in `app/server/db/schema.ts`
- [ ] T008 Create `app/composables/useEntryEngine.ts` composable wrapping server service
- [ ] T009 Add unit tests for entryEngine in `app/server/services/entryEngine.test.ts`
- [ ] T010 Add unit tests for conflictDetector in `app/server/services/conflictDetector.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Unified Entry Engine (Priority: P0) 🎯 MVP

**Goal**: Every entry creation path uses the same underlying system

**Independent Test**: All entry paths (timer, quick add, voice, import) produce entries with consistent structure

### Implementation for User Story 1

- [ ] T011 [US1] Migrate `app/pages/timer.vue` to use useEntryEngine instead of useEntrySave
- [ ] T012 [US1] Migrate `app/pages/add.vue` to use useEntryEngine
- [ ] T013 [US1] Migrate `app/pages/tada/index.vue` to use useEntryEngine
- [ ] T014 [US1] Migrate `app/pages/voice.vue` to use useEntryEngine
- [ ] T015 [US1] Migrate `app/pages/entry/[id].vue` (duplicate) to use useEntryEngine
- [ ] T016 [US1] Migrate `app/composables/useCSVImport.ts` to use useEntryEngine
- [ ] T017 [US1] Add integration tests verifying no behavior change in `app/tests/integration/entry-engine.test.ts`
- [ ] T018 [US1] Deprecate old methods in useEntrySave with console.warn pointing to useEntryEngine

**Checkpoint**: User Story 1 complete - all entry paths unified

---

## Phase 4: User Story 2 - Quick Past Timer Entry (Priority: P1)

**Goal**: Users can log a past timed session in under 10 seconds

**Independent Test**: User can add a past timed entry from a single form and see it in timeline/rhythms

### Implementation for User Story 2

- [ ] T019 [P] [US2] Create `app/components/QuickValuePicker.vue` as shared base for Duration/Count pickers
- [ ] T020 [P] [US2] Create `app/components/DurationPicker.vue` extending QuickValuePicker with smart text parsing
- [ ] T021 [P] [US2] Create `app/components/DateTimePicker.vue` for combined date + time selection
- [ ] T022 [P] [US2] Create `app/components/EntryTypeToggle.vue` for timed/count/moment modes
- [ ] T023 [US2] Create `app/components/QuickEntryModal.vue` with past-timer mode
- [ ] T024 [US2] Add `GET /api/durations/recent` endpoint in `app/server/api/durations/recent.get.ts`
- [ ] T025 [US2] Wire QuickEntryModal to useEntryEngine for saving past entries
- [ ] T026 [US2] Add entry point to QuickEntryModal from main navigation/FAB

**Checkpoint**: User Story 2 complete - past timer entry works independently

---

## Phase 5: User Story 3 - Quick Count Entry (Priority: P1)

**Goal**: Users can log a count-based activity in under 5 seconds

**Independent Test**: User can log reps and see them reflected in stats

### Implementation for User Story 3

- [ ] T027 [P] [US3] Create `app/components/CountPicker.vue` extending QuickValuePicker with exercise context presets
- [ ] T028 [P] [US3] Create `app/components/ActivityAutocomplete.vue` with suggestion dropdown
- [ ] T029 [US3] Add `GET /api/entries/suggestions` endpoint in `app/server/api/entries/suggestions.get.ts`
- [ ] T030 [US3] Add `GET /api/counts/recent` endpoint in `app/server/api/counts/recent.get.ts`
- [ ] T031 [US3] Add count/reps mode to QuickEntryModal in `app/components/QuickEntryModal.vue`
- [ ] T032 [US3] Ensure reps entries save with count in data field via useEntryEngine
- [ ] T033 [US3] Add activity_history tracking on entry save in entryEngine

**Checkpoint**: User Story 3 complete - count entry works independently

---

## Phase 6: User Story 4 - Voice Quick Entry (Priority: P1)

**Goal**: Voice commands correctly parse entry type and values 90%+ of the time

**Independent Test**: Speaking a natural phrase creates the correct entry type with extracted values

### Implementation for User Story 4

- [ ] T034 [US4] Implement duration parsing in `app/utils/naturalLanguageParser.ts` ("20 min", "1h 30m")
- [ ] T035 [US4] Implement count parsing in `app/utils/naturalLanguageParser.ts` ("30 burpees")
- [ ] T036 [US4] Implement time reference parsing ("this morning", "at 7am", "yesterday")
- [ ] T037 [US4] Add `POST /api/entries/parse` endpoint in `app/server/api/entries/parse.post.ts`
- [ ] T038 [US4] Integrate parsed entry confirmation UI in voice flow
- [ ] T039 [P] [US4] Create `app/components/ConflictWarning.vue` for overlap display
- [ ] T040 [US4] Add conflict detection to entry creation flow in QuickEntryModal
- [ ] T041 [US4] Add unit tests for naturalLanguageParser in `app/utils/naturalLanguageParser.test.ts`

**Checkpoint**: User Story 4 complete - voice parsing works independently

---

## Phase 7: User Story 4b - Draft Entries (Priority: P1)

**Goal**: Unconfirmed parsed entries are auto-saved as drafts

**Independent Test**: Incomplete voice entries persist and can be resumed

### Implementation for User Story 4b

- [ ] T042 [US4] Add `GET /api/entries/drafts` endpoint in `app/server/api/entries/drafts/index.get.ts`
- [ ] T043 [US4] Add `POST /api/entries/drafts` endpoint in `app/server/api/entries/drafts/index.post.ts`
- [ ] T044 [US4] Add `DELETE /api/entries/drafts/[id]` endpoint in `app/server/api/entries/drafts/[id].delete.ts`
- [ ] T045 [US4] Add `POST /api/entries/drafts/[id]/commit` endpoint in `app/server/api/entries/drafts/[id]/commit.post.ts`
- [ ] T046 [P] [US4] Create `app/components/DraftIndicator.vue` showing "N unsaved entries"
- [ ] T047 [US4] Add draft auto-save to voice parsing flow when user abandons confirmation
- [ ] T048 [US4] Add draft resume UI in QuickEntryModal

**Checkpoint**: User Story 4b complete - drafts work independently

---

## Phase 8: User Story 5 - Moment Capture (Priority: P2)

**Goal**: Capture a moment with a single text field in under 3 seconds

**Independent Test**: Quick journal entry with minimal friction

### Implementation for User Story 5

- [ ] T049 [US5] Add moment capture mode to QuickEntryModal in `app/components/QuickEntryModal.vue`
- [ ] T050 [US5] Implement keyword-based category inference in `app/utils/naturalLanguageParser.ts`
- [ ] T051 [US5] Add keyboard shortcut or gesture to open moment capture quickly

**Checkpoint**: User Story 5 complete - moment capture works independently

---

## Phase 9: User Story 6 - Rhythms Handle Counts (Priority: P2)

**Goal**: Rhythm charts display rep totals for count-based entries

**Independent Test**: Reps entries show "X reps" not "0 minutes" in rhythm stats

### Implementation for User Story 6

- [ ] T052 [US6] Extend `GET /api/rhythms/[id]/stats` to return totalCount for reps in `app/server/api/rhythms/[id]/stats.get.ts`
- [ ] T053 [US6] Update `app/components/RhythmBarChart.vue` to display counts vs duration based on entry type
- [ ] T054 [US6] Update `app/components/PeriodSummaryCard.vue` to show "X reps" for count-based rhythms
- [ ] T055 [US6] Handle mixed entry types in rhythm display (timed + reps gracefully)

**Checkpoint**: User Story 6 complete - rhythm counts work independently

---

## Phase 10: User Story 7 - Attachment Placeholder (Priority: P3)

**Goal**: Entry forms show attachment UI placeholder

**Independent Test**: All entry forms display "attach" option with "coming soon" indicator

### Implementation for User Story 7

- [ ] T056 [P] [US7] Create `app/components/AttachmentPlaceholder.vue` with "coming soon" UI
- [ ] T057 [US7] Add AttachmentPlaceholder to QuickEntryModal
- [ ] T058 [US7] Add AttachmentPlaceholder to timer.vue post-session form
- [ ] T059 [US7] Add AttachmentPlaceholder to add.vue entry form

**Checkpoint**: User Story 7 complete - attachment placeholder visible

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T060 [P] Update `app/composables/useEntrySave.ts` to mark deprecated methods
- [ ] T061 [P] Add JSDoc comments to all new services and composables
- [ ] T062 Run `bun run lint:fix` on all modified files
- [ ] T063 Run `bun run typecheck` to verify no type errors
- [ ] T064 Validate against quickstart.md examples
- [ ] T065 Manual QA: test all entry paths end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → [All User Stories can start]
                                         ↓
                           ┌─────────────┼─────────────┐
                           ↓             ↓             ↓
                        Phase 3       Phase 4       Phase 5
                         (US1)         (US2)         (US3)
                           ↓             ↓             ↓
                        [MVP]       [Quick Add]   [Counts]
                                         ↓
                                      Phase 6-7
                                     (US4: Voice)
                                         ↓
                                      Phase 8-9
                                      (US5-6)
                                         ↓
                                      Phase 10
                                       (US7)
                                         ↓
                                      Phase 11
                                      (Polish)
```

### Parallel Opportunities

**Within Phase 2 (Foundational):**

- T006 and T007 (schema migrations) can run in parallel
- T009 and T010 (unit tests) can run in parallel after services exist

**Within User Stories:**

- T019, T020, T021, T022 (P1 components) can run in parallel
- T027, T028 (CountPicker + ActivityAutocomplete) can run in parallel
- T039, T046 (conflict/draft indicators) can run in parallel
- T056 (attachment placeholder) can run in parallel with any phase

### MVP Delivery (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010)
3. Complete Phase 3: User Story 1 (T011-T018)
4. **STOP and VALIDATE**: Test all entry paths work identically
5. Deploy as v0.3.0-alpha

---

## Summary

| Phase        | Tasks     | User Story                  | Priority |
| ------------ | --------- | --------------------------- | -------- |
| Setup        | T001-T003 | -                           | -        |
| Foundational | T004-T010 | -                           | Blocking |
| Phase 3      | T011-T018 | US1: Unified Engine         | P0 (MVP) |
| Phase 4      | T019-T026 | US2: Past Timer             | P1       |
| Phase 5      | T027-T033 | US3: Count Entry            | P1       |
| Phase 6-7    | T034-T048 | US4: Voice + Drafts         | P1       |
| Phase 8      | T049-T051 | US5: Moment Capture         | P2       |
| Phase 9      | T052-T055 | US6: Rhythm Counts          | P2       |
| Phase 10     | T056-T059 | US7: Attachment Placeholder | P3       |
| Polish       | T060-T065 | -                           | -        |

**Total Tasks**: 65  
**Parallel Opportunities**: 17 tasks marked [P]  
**MVP Scope**: 18 tasks (Phases 1-3)
