# Tasks: Ourmoji Module

**Input**: Design documents from `/specs/013-ourmoji-module/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Included because the specification explicitly defines mandatory testing scenarios and independent test criteria for each user story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the Ourmoji feature scaffolding and baseline contracts/types.

- [X] T001 Create feature folders for API/services/components/config in `app/server/api/ourmoji/`, `app/server/services/ourmoji/`, `app/components/ourmoji/`, `app/utils/ourmoji/`, and `app/types/ourmoji.ts`
- [X] T002 [P] Add initial module constants for Sacred Set and Wheel-of-Year placeholders in `app/utils/ourmoji/constants.ts`
- [X] T003 [P] Add Zod request/response schemas for Ourmoji endpoints in `app/server/api/ourmoji/schemas.ts`
- [X] T004 [P] Add initial route stubs for all contract endpoints in `app/server/api/ourmoji/*.ts`
- [X] T005 Add feature-level logger wrappers using `createLogger` in `app/server/services/ourmoji/logger.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared foundations required before any user story.

**CRITICAL**: No user story work should begin before this phase is complete.

- [X] T006 Add Ourmoji experiment table definitions to `app/server/db/schema.ts`
- [X] T007 Generate Drizzle migration for new tables in `app/server/db/migrations/`
- [X] T008 Implement DB operations helpers for Ourmoji tables in `app/server/services/ourmoji/repository.ts`
- [X] T009 Add typed domain models and DTOs in `app/types/ourmoji.ts`
- [X] T010 Implement feature-flag guard helper for `enabledModules` in `app/server/services/ourmoji/access.ts`
- [X] T011 Register `ourmoji` and `dream-experiment` entry types in `app/registry/entryTypes.ts`
- [X] T012 [P] Add Sacred Set static configuration (23 emoji + metadata) in `app/utils/ourmoji/sacredSet.ts`
- [X] T013 [P] Add Wheel-of-Year static configuration and lookup helpers in `app/utils/ourmoji/wheelOfYear.ts`
- [X] T014 Implement deterministic randomization utility with seed + night index in `app/server/services/ourmoji/randomization.ts`
- [X] T015 Implement base validation/error mapping for Ourmoji API in `app/server/services/ourmoji/validation.ts`
- [X] T016 Add scheduler plugin shell for periodic assignment sweeps in `app/server/plugins/ourmoji-scheduler.ts`

**Checkpoint**: Foundation complete; user stories can now proceed.

---

## Phase 3: User Story 1 - Daily Ourmoji Reception & Display (Priority: P1) 🎯 MVP

**Goal**: Enabled users can receive daily Ourmoji entries via API and view current/history with moon and Wheel context.

**Independent Test**: Post daily payload, verify upsert and rendering for enabled users, and invisibility for disabled users.

### Tests for User Story 1

- [X] T017 [P] [US1] Add API contract test for `POST /api/ourmoji/daily` in `app/server/api/ourmoji/daily.post.test.ts`
- [X] T018 [P] [US1] Add API contract test for `GET /api/ourmoji/calendar` in `app/server/api/ourmoji/calendar.get.test.ts`
- [X] T019 [P] [US1] Add integration test for per-date upsert (no duplicates) in `app/tests/api/ourmoji-daily.integration.test.ts`
- [X] T020 [P] [US1] Add integration test for feature-flag invisibility behavior in `app/tests/api/ourmoji-access.integration.test.ts`

### Implementation for User Story 1

- [X] T021 [US1] Implement daily upsert service using `entries` table + typed `data` payload in `app/server/services/ourmoji/daily.ts`
- [X] T022 [US1] Implement `POST /api/ourmoji/daily` endpoint with schema validation in `app/server/api/ourmoji/daily.post.ts`
- [X] T023 [US1] Implement `GET /api/ourmoji/calendar` endpoint in `app/server/api/ourmoji/calendar.get.ts`
- [X] T024 [US1] Create today/history composable for Ourmoji data fetching in `app/composables/useOurmoji.ts`
- [X] T025 [US1] Build Ourmoji daily card UI (emoji, reflection, moon, wheel) in `app/components/ourmoji/OurmojiDailyCard.vue`
- [X] T026 [US1] Build calendar grid/detail UI for historical entries in `app/components/ourmoji/OurmojiCalendar.vue`
- [X] T027 [US1] Add Ourmoji page route with graceful hidden state in `app/pages/ourmoji.vue`
- [X] T028 [US1] Wire navigation visibility for enabled modules in `app/layouts/default.vue`

**Checkpoint**: US1 is independently shippable as MVP.

---

## Phase 4: User Story 4 - Experiment Run Management (Priority: P2)

**Goal**: Admin/owners can create, list, pause, resume, and complete experiment runs with participant eligibility constraints.

**Independent Test**: Create run, validate participant exclusivity, pause/resume behavior, and end-state transitions.

### Tests for User Story 4

- [X] T029 [P] [US4] Add contract test for `POST /api/ourmoji/experiments` in `app/server/api/ourmoji/experiments.post.test.ts`
- [X] T030 [P] [US4] Add contract test for `GET /api/ourmoji/experiments` in `app/server/api/ourmoji/experiments.get.test.ts`
- [X] T031 [P] [US4] Add contract tests for pause/resume endpoints in `app/server/api/ourmoji/experiments-status.post.test.ts`
- [X] T032 [P] [US4] Add integration test for one-active-experiment-per-user guard in `app/tests/api/ourmoji-participants.integration.test.ts`

### Implementation for User Story 4

- [X] T033 [US4] Implement experiment run lifecycle service in `app/server/services/ourmoji/experiments.ts`
- [X] T034 [US4] Implement participant membership and eligibility checks in `app/server/services/ourmoji/participants.ts`
- [X] T035 [US4] Implement `POST /api/ourmoji/experiments` in `app/server/api/ourmoji/experiments.post.ts`
- [X] T036 [US4] Implement `GET /api/ourmoji/experiments` in `app/server/api/ourmoji/experiments.get.ts`
- [X] T037 [US4] Implement pause endpoint in `app/server/api/ourmoji/experiments/[experimentId]/pause.post.ts`
- [X] T038 [US4] Implement resume endpoint in `app/server/api/ourmoji/experiments/[experimentId]/resume.post.ts`
- [X] T039 [US4] Build run management UI (list + create + pause/resume) in `app/components/ourmoji/ExperimentRunManager.vue`
- [X] T040 [US4] Add experiment management page and routing in `app/pages/ourmoji/experiments.vue`

**Checkpoint**: US4 is independently testable for run control-plane behavior.

---

## Phase 5: User Story 2 - Nightly Assignment & Role Management (Priority: P2)

**Goal**: At 21:00 earliest participant timezone, assignments are generated idempotently with proper blinding and weighted distribution.

**Independent Test**: Trigger assignment sweep, confirm role creation, sender/receiver message behavior, and no duplicate assignment rows.

### Tests for User Story 2

- [ ] T041 [P] [US2] Add contract test for manual assignment trigger endpoint in `app/server/api/ourmoji/experiments/[experimentId]/assignments/trigger.post.test.ts`
- [ ] T042 [P] [US2] Add unit tests for seeded assignment algorithm in `app/server/services/ourmoji/randomization.test.ts`
- [ ] T043 [P] [US2] Add integration test for scheduler idempotency constraint in `app/tests/api/ourmoji-assignment-idempotency.integration.test.ts`
- [ ] T044 [P] [US2] Add integration test for receiver blinding in notification payloads in `app/tests/api/ourmoji-blinding.integration.test.ts`

### Implementation for User Story 2

- [ ] T045 [US2] Implement nightly assignment generation service in `app/server/services/ourmoji/assignments.ts`
- [ ] T046 [US2] Implement earliest-timezone due-time computation in `app/server/services/ourmoji/schedule.ts`
- [ ] T047 [US2] Implement email-first notification dispatch for sender/receiver roles in `app/server/services/ourmoji/notifications.ts`
- [ ] T048 [US2] Implement delivery attempt audit persistence in `app/server/services/ourmoji/delivery.ts`
- [ ] T049 [US2] Implement manual assignment trigger endpoint in `app/server/api/ourmoji/experiments/[experimentId]/assignments/trigger.post.ts`
- [ ] T050 [US2] Complete scheduler sweep execution in `app/server/plugins/ourmoji-scheduler.ts`

**Checkpoint**: US2 assignments are correct, idempotent, and blinded.

---

## Phase 6: User Story 6 - Voice Recording & Transcription Integration (Priority: P2)

**Goal**: Dream capture uses existing `VoiceRecorder` as-is with text fallback.

**Independent Test**: Record voice in dream panel, verify transcription/editability, and fallback behavior on failure.

### Tests for User Story 6

- [ ] T051 [P] [US6] Add component test for VoiceRecorder integration path in `app/components/ourmoji/DreamCapturePanel.test.ts`
- [ ] T052 [P] [US6] Add component test for transcription failure fallback in `app/components/ourmoji/DreamCapturePanel.test.ts`

### Implementation for User Story 6

- [ ] T053 [US6] Build dream capture panel using existing `VoiceRecorder` in `app/components/ourmoji/DreamCapturePanel.vue`
- [ ] T054 [US6] Add transcription-to-dream-text state management in `app/composables/useDreamExperimentFlow.ts`
- [ ] T055 [US6] Implement manual text fallback UX and error messaging in `app/components/ourmoji/DreamCapturePanel.vue`
- [ ] T056 [US6] Add shared field length handling (5000-char limit + warning) in `app/server/services/ourmoji/validation.ts`

**Checkpoint**: US6 voice integration is independently testable.

---

## Phase 7: User Story 3 - Dream Recording, Guessing & Reveal Flow (Priority: P2)

**Goal**: Receiver flow supports morning prompt, dream lock, guess lock, reveal, and interruption-safe resume.

**Independent Test**: Submit dream then guess, verify locking and reveal; close app after dream submission and confirm resume at guess-only state.

### Tests for User Story 3

- [ ] T057 [P] [US3] Add contract test for `GET /api/ourmoji/experiments/{experimentId}/morning-prompt` in `app/server/api/ourmoji/experiments/[experimentId]/morning-prompt.get.test.ts`
- [ ] T058 [P] [US3] Add contract test for dream submission endpoint in `app/server/api/ourmoji/submissions/[assignmentId]/dream.post.test.ts`
- [ ] T059 [P] [US3] Add contract test for guess submission endpoint in `app/server/api/ourmoji/submissions/[assignmentId]/guess.post.test.ts`
- [ ] T060 [P] [US3] Add integration test for interruption-safe resume (`dream_locked`) in `app/tests/api/ourmoji-resume.integration.test.ts`

### Implementation for User Story 3

- [ ] T061 [US3] Implement morning prompt service + endpoint in `app/server/services/ourmoji/morningPrompt.ts` and `app/server/api/ourmoji/experiments/[experimentId]/morning-prompt.get.ts`
- [ ] T062 [US3] Implement dream submission lock transition in `app/server/services/ourmoji/submissions.ts`
- [ ] T063 [US3] Implement guess submission + hit/miss reveal transition in `app/server/services/ourmoji/reveal.ts`
- [ ] T064 [US3] Implement dream submission endpoint in `app/server/api/ourmoji/submissions/[assignmentId]/dream.post.ts`
- [ ] T065 [US3] Implement guess submission endpoint in `app/server/api/ourmoji/submissions/[assignmentId]/guess.post.ts`
- [ ] T066 [US3] Build Sacred Set picker UI (23-choice forced grid + confidence) in `app/components/ourmoji/SacredSetPicker.vue`
- [ ] T067 [US3] Build reveal panel UI (send/control + hit/miss states) in `app/components/ourmoji/DreamRevealPanel.vue`
- [ ] T068 [US3] Build end-to-end flow wrapper (banner -> capture -> guess -> reveal) in `app/components/ourmoji/DreamExperimentFlow.vue`
- [ ] T069 [US3] Mount morning flow entry point on main experience in `app/pages/index.vue`

**Checkpoint**: US3 core morning flow is complete and independently verifiable.

---

## Phase 8: User Story 5 - Experiment Statistics & Analysis Dashboard (Priority: P3)

**Goal**: Completed runs show full analytics; active runs show neutral progress only.

**Independent Test**: Verify active-run redacted payload and completed-run full metrics including binomial p-value and anonymized breakdowns.

### Tests for User Story 5

- [ ] T070 [P] [US5] Add contract test for `GET /api/ourmoji/experiments/{experimentId}/stats` active state in `app/server/api/ourmoji/experiments/[experimentId]/stats.get.test.ts`
- [ ] T071 [P] [US5] Add contract test for completed run full stats payload in `app/server/api/ourmoji/experiments/[experimentId]/stats.get.test.ts`
- [ ] T072 [P] [US5] Add unit tests for exact binomial p-value helper in `app/server/services/ourmoji/statistics.test.ts`
- [ ] T073 [P] [US5] Add integration test for participant anonymization in stats output in `app/tests/api/ourmoji-stats-anon.integration.test.ts`

### Implementation for User Story 5

- [ ] T074 [US5] Implement experiment statistics aggregation service in `app/server/services/ourmoji/statistics.ts`
- [ ] T075 [US5] Implement exact binomial p-value utility in `app/server/utils/binomial.ts`
- [ ] T076 [US5] Implement active-run redaction serializer in `app/server/services/ourmoji/statsSerializer.ts`
- [ ] T077 [US5] Implement stats endpoint in `app/server/api/ourmoji/experiments/[experimentId]/stats.get.ts`
- [ ] T078 [US5] Build statistics dashboard UI with active/completed states in `app/components/ourmoji/ExperimentStats.vue`
- [ ] T079 [US5] Add stats page route in `app/pages/ourmoji/experiments/[experimentId]/stats.vue`

**Checkpoint**: US5 analytics are independently testable and safely redacted during active runs.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, documentation, and full-flow verification across stories.

- [ ] T080 [P] Add end-to-end quickstart validation script steps in `app/scripts/validate-ourmoji-quickstart.ts`
- [ ] T081 [P] Add API docs notes for Ourmoji endpoints in `docs/tada-api/README.md`
- [ ] T082 Add performance instrumentation for assignment sweep and morning endpoints in `app/server/services/ourmoji/metrics.ts`
- [ ] T083 Add edge-case handling for emoji rendering fallback labels in `app/components/ourmoji/SacredSetPicker.vue`
- [ ] T084 Add final regression tests for core happy paths in `app/tests/integration/ourmoji-full-flow.integration.test.ts`
- [ ] T085 Run quickstart end-to-end checklist updates in `specs/013-ourmoji-module/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): can start immediately.
- Phase 2 (Foundational): depends on Phase 1; blocks all user stories.
- Phase 3+ (User stories): depend on Phase 2 completion.
- Phase 9 (Polish): depends on completion of desired user stories.

### User Story Dependencies

- **US1 (P1)**: depends only on foundational phase.
- **US4 (P2)**: depends only on foundational phase.
- **US2 (P2)**: depends on US4 run lifecycle primitives.
- **US6 (P2)**: depends only on foundational phase; can proceed in parallel with US4/US2.
- **US3 (P2)**: depends on US2 assignments and US6 capture UI.
- **US5 (P3)**: depends on US2/US3 data generation.

### Recommended Story Order

1. US1 (MVP)
2. US4
3. US2 + US6 (parallel)
4. US3
5. US5

---

## Parallel Opportunities

- Setup: T002, T003, T004 can run in parallel.
- Foundational: T012 and T013 can run in parallel.
- US1 tests: T017-T020 can run in parallel.
- US4 tests: T029-T032 can run in parallel.
- US2 tests: T041-T044 can run in parallel.
- US3 tests: T057-T060 can run in parallel.
- US5 tests: T070-T073 can run in parallel.
- US2 and US6 implementation phases can be staffed in parallel after US4.

### Parallel Example: US1

```bash
# Run these in parallel after foundational completion:
T017 app/server/api/ourmoji/daily.post.test.ts
T018 app/server/api/ourmoji/calendar.get.test.ts
T019 app/tests/api/ourmoji-daily.integration.test.ts
T020 app/tests/api/ourmoji-access.integration.test.ts
```

### Parallel Example: US2 + US6

```bash
# Team split after US4 is complete:
# Engineer A (US2)
T045 app/server/services/ourmoji/assignments.ts
T047 app/server/services/ourmoji/notifications.ts

# Engineer B (US6)
T053 app/components/ourmoji/DreamCapturePanel.vue
T054 app/composables/useDreamExperimentFlow.ts
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Deliver US1 end-to-end (T017-T028).
3. Validate with quickstart daily ingestion/display scenario.
4. Demo/deploy MVP slice.

### Incremental Delivery

1. Add US4 run management.
2. Add US2 assignment orchestration and notifications.
3. Add US6 voice capture integration.
4. Add US3 morning flow and reveal lifecycle.
5. Add US5 analytics and redaction.

### Risk-First Focus

- T014/T045/T050: deterministic + idempotent scheduler behavior.
- T047/T048: notification reliability and audit trail.
- T062/T063: lock-state integrity and interruption-safe resume.
- T076/T077: strict active-run analytics redaction.

---

## Notes

- `[P]` means the task can be executed in parallel (different files, no blocking dependency).
- `[USx]` labels are used only for user-story phase tasks.
- Each story has explicit independent test criteria to support incremental delivery.
- Keep commits scoped to logical task groups and validate before moving to the next checkpoint.
