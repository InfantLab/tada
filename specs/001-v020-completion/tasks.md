# Tasks: v0.2.0 Core Experience Completion

**Input**: Design documents from `/specs/001-v020-completion/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: Not explicitly requested - minimal test tasks included only for logger fix (pre-existing tests)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Foundation infrastructure shared across all user stories

- [x] T001 Add `emoji` column to entries table in app/server/db/schema.ts
- [x] T002 Add `timerPresets` table to app/server/db/schema.ts
- [x] T003 Add `userPreferences` table to app/server/db/schema.ts
- [x] T004 Generate and apply migrations: `bun run db:generate && bun run db:migrate`
- [x] T005 [P] Add celebration sound file at app/public/sounds/tada-celebration.mp3

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared composables and utilities that multiple stories depend on

- [x] T006 [P] Create usePreferences composable in app/composables/usePreferences.ts
- [x] T007 [P] Create useUndo composable in app/composables/useUndo.ts
- [x] T008 Integrate ToastContainer into app/layouts/default.vue (existing component)
- [x] T009 [P] Create GET /api/preferences endpoint in app/server/api/preferences.get.ts
- [x] T010 [P] Create PUT /api/preferences endpoint in app/server/api/preferences.put.ts

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 9 - Toast Notification System (Priority: P2) 🎯 MVP

**Goal**: Replace all browser alerts with styled toast notifications

**Independent Test**: Trigger save/delete/error actions and verify toast appears instead of alert

### Implementation

- [x] T011 [US9] Replace alert() calls in app/pages/timer.vue with useToast
- [x] T012 [P] [US9] Replace alert() calls in app/pages/add.vue with useToast
- [x] T013 [P] [US9] Replace alert() calls in app/pages/settings.vue with useToast
- [x] T014 [P] [US9] Replace alert() calls in app/pages/journal.vue with useToast
- [x] T015 [US9] Search and replace remaining alert() calls across all pages

**Checkpoint**: No browser alert dialogs in normal usage

---

## Phase 4: User Story 11 - Fix Logger Test Failures (Priority: P3)

**Goal**: All 140+ tests pass including 7 logger tests

**Independent Test**: Run `bun run test` and verify all logger tests pass

### Implementation

- [x] T016 [US11] Analyze failing logger tests in app/utils/logger.test.ts
- [x] T017 [US11] Fix JSON format assertions in app/utils/logger.ts or app/utils/logger.test.ts
- [x] T018 [US11] Verify all tests pass with `bun run test`

**Checkpoint**: Clean test suite, CI-ready

---

## Phase 5: User Story 2 - Universal Entry Editing (Priority: P1)

**Goal**: Users can tap any entry to edit title, contents, emoji, or delete

**Independent Test**: Tap entry in timeline, edit fields, save, verify changes persist

### Implementation

- [x] T019 [US2] Create entry edit page at app/pages/entry/[id].vue
- [x] T020 [P] [US2] Create PUT /api/entries/[id].put.ts for entry updates (with emoji field)
- [x] T021 [P] [US2] Create DELETE /api/entries/[id].delete.ts for entry deletion
- [x] T022 [US2] Add navigation from timeline entries to edit page in app/components/VirtualTimeline.vue
- [x] T023 [US2] Implement emoji display logic: entry.emoji → category emoji → default

**Checkpoint**: Any entry can be edited or deleted from timeline

---

## Phase 6: User Story 1 - Ta-Da! Celebration Experience (Priority: P1)

**Goal**: Dedicated Ta-Da page with triumphant sound and celebratory animation

**Independent Test**: Navigate to /tada/add, save a Ta-Da, hear sound and see animation

### Implementation

- [x] T024 [US1] Create dedicated Ta-Da page at app/pages/tada/add.vue
- [x] T025 [US1] Implement celebration sound playback on save
- [x] T026 [US1] Add celebratory CSS animation/confetti effect
- [x] T027 [US1] Remove Ta-Da from entry types in app/pages/add.vue (or journal add page)

**Checkpoint**: Ta-Das feel special and celebratory

---

## Phase 7: User Story 3 - Timer Presets (Priority: P2)

**Goal**: Save and reuse timer configurations with one tap

**Independent Test**: Save preset from timer, select preset, verify timer starts with saved config

### Implementation

- [x] T028 [US3] Create GET /api/presets.get.ts endpoint
- [x] T029 [P] [US3] Create POST /api/presets.post.ts endpoint
- [x] T030 [P] [US3] Create PUT /api/presets/[id].put.ts endpoint
- [x] T031 [P] [US3] Create DELETE /api/presets/[id].delete.ts endpoint
- [x] T032 [US3] Add "Save as Preset" button to app/pages/timer.vue
- [x] T033 [US3] Create preset picker component app/components/TimerPresetPicker.vue
- [x] T034 [US3] Integrate preset picker into timer page
- [x] T035 [P] [US3] Add preset management UI in app/pages/settings.vue

**Checkpoint**: Timer presets can be created, selected, and managed

---

## Phase 8: User Story 5 - Custom Emojis for Categories (Priority: P2)

**Goal**: Users can change emojis for any category or subcategory

**Independent Test**: Change category emoji in settings, verify timeline shows new emoji

### Implementation

- [x] T036 [US5] Add emoji customization section to app/pages/settings.vue
- [x] T037 [US5] Integrate EmojiPicker for category emoji selection
- [x] T038 [US5] Update timeline/entry display to use custom emojis from preferences

**Checkpoint**: Emojis can be personalized throughout the app

---

## Phase 9: User Story 4 - Customise Entry Types in Journal (Priority: P2)

**Goal**: Hide/show entry types, add custom entry types

**Independent Test**: Hide an entry type, verify it disappears from journal add page

### Implementation

- [x] T039 [US4] Add entry type visibility toggles in app/pages/settings.vue
- [x] T040 [US4] Add custom entry type creation UI in settings
- [x] T041 [US4] Filter entry types in journal add page based on preferences
- [x] T042 [US4] Display custom entry types in journal add page

**Checkpoint**: Journal add page shows only desired entry types

---

## Phase 10: User Story 10 - Subcategory Auto-complete (Priority: P3)

**Goal**: Previously used subcategories appear as suggestions when typing

**Independent Test**: Create entries with subcategories, start typing in new entry, see suggestions

### Implementation

- [x] T043 [US10] Create GET /api/subcategories.get.ts endpoint
- [x] T044 [US10] Add auto-complete behavior to subcategory inputs across forms
- [x] T045 [US10] Cache subcategory suggestions in usePreferences composable

**Note**: Current timer UI uses button-based subcategory selection; autocomplete infrastructure is ready for future text input forms.

**Checkpoint**: Subcategory entry is faster with auto-complete

---

## Phase 11: User Story 6 - Hide Unused Categories (Priority: P3)

**Goal**: Users can hide categories they don't use from all pickers

**Independent Test**: Hide a category, verify it disappears from all category pickers

### Implementation

- [x] T046 [US6] Add category visibility toggles in app/pages/settings.vue
- [x] T047 [US6] Filter category options in all pickers using preferences
- [x] T048 [US6] Ensure hidden categories still display for existing entries

**Checkpoint**: Category pickers show only relevant options

---

## Phase 12: User Story 8 - Undo Support (Priority: P3)

**Goal**: Deletions can be undone within a time window

**Independent Test**: Delete entry, tap undo in toast, verify entry is restored

### Implementation

- [x] T049 [US8] Implement undo buffer in useUndo composable (client-side storage)
- [x] T050 [US8] Show "Undo" action in deletion toast notifications
- [x] T051 [US8] Implement restore via soft-delete/re-insert logic
- [x] T052 [US8] Add expiry timer to clear undo buffer after 30 seconds

**Checkpoint**: Accidental deletions are recoverable

---

## Phase 13: User Story 7 - Delete Category Data (Priority: P3)

**Goal**: Bulk delete all entries in a category with confirmation

**Independent Test**: Select "Delete all data" for a category, confirm, verify entries removed

### Implementation

- [x] T053 [US7] Create DELETE /api/entries bulk endpoint with category filter
- [x] T054 [US7] Add "Delete all data" button per category in settings
- [x] T055 [US7] Implement confirmation modal with entry count
- [x] T056 [US7] Integrate with undo system for bulk deletion recovery

**Checkpoint**: Users can cleanly remove unwanted data categories

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [x] T057 [P] Run typecheck: `bun run typecheck`
- [x] T058 [P] Run lint fix: `bun run lint:fix`
- [x] T059 Verify all tests pass: `bun run test` (179 passed, 2 pre-existing integration failures)
- [ ] T060 Manual QA: walk through quickstart.md validation checklist
- [x] T061 Update CHANGELOG.md with v0.2.0 features

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - schema changes first
- **Phase 2 (Foundational)**: Depends on Phase 1 - shared infrastructure
- **Phases 3-13 (User Stories)**: All depend on Phase 2 completion
- **Phase 14 (Polish)**: After all desired user stories complete

### User Story Priority Order

If implementing sequentially:

1. US9 (Toast) - Foundation for user feedback
2. US11 (Logger) - Clean test baseline
3. US2 (Entry Edit) - Core functionality
4. US1 (Ta-Da) - Signature feature
5. US3 (Presets) - Power user feature
6. US5 (Emojis) - Customization
7. US4 (Entry Types) - Customization
8. US10 (Autocomplete) - Polish
9. US6 (Hide Categories) - Customization
10. US8 (Undo) - Safety net
11. US7 (Delete Data) - Data management

### Parallel Opportunities

```bash
# After Phase 2, these can run in parallel:
- US9 (Toast) ─┬─ T011-T015 (parallel per page)
- US11 (Logger) ─ T016-T018
- US2 (Entry Edit) ─ T019-T023

# Within US3 (Presets), API endpoints are parallel:
- T028, T029, T030, T031 (all [P])

# Within Phase 14, checks are parallel:
- T057, T058 (typecheck, lint)
```

---

## Notes

- Total: 61 tasks across 14 phases
- MVP scope: Phases 1-6 (Setup + Foundation + Toast + Logger + Entry Edit + Ta-Da)
- Each user story is independently completable
- Commit after each task or logical group
- Stop at any checkpoint to validate functionality
