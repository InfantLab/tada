# Phase 0 Research: Ourmoji Module

## Decision 1: Register dedicated entry types (`ourmoji`, `dream-experiment`)

- Decision: Use the existing entry type registry to register dedicated types rather than overloading `moment` subcategories.
- Rationale: The repo already has a central registry (`app/registry/entryTypes.ts`) and quick-add/navigation patterns built around explicit type definitions. Dedicated types isolate validation, UI routes, and analytics semantics.
- Alternatives considered:
  - Use `moment` + subcategory: rejected because it blurs semantics and makes feature-specific validation/reporting harder.

## Decision 2: Use dedicated experiment tables + `entries` linkage

- Decision: Keep Ourmoji day content in `entries` (`type=ourmoji`) and add dedicated experiment tables for runs, assignments, submissions, and delivery attempts.
- Rationale: Experiment orchestration has strict uniqueness, idempotency, and scheduling requirements that exceed a flat JSON-only entry model.
- Alternatives considered:
  - Store all experiment state in `entries.data`: rejected due to weak relational guarantees and difficult uniqueness constraints.

## Decision 3: Scheduler model mirrors weekly-rhythms sweep pattern

- Decision: Implement an Ourmoji scheduler plugin with periodic sweeps, precomputed due UTC times, and per-night idempotency keys.
- Rationale: Weekly Rhythms already demonstrates a robust pattern (`app/server/plugins/weekly-rhythms.ts`, `scheduler.ts`) with startup catch-up + periodic sweeps.
- Alternatives considered:
  - Per-user cron timers: rejected due to complexity and process restarts.
  - External scheduler service: rejected for MVP scope.

## Decision 4: MVP notification channel is email-first, push-capable

- Decision: Use email delivery as required channel for MVP; keep push integration optional and compatible with existing subscription system.
- Rationale: Email path is production-hardened in current codebase. Push exists but has greater runtime dependency and subscription-state variability.
- Alternatives considered:
  - Push-only: rejected for reliability risk.
  - Dual required channels: rejected as unnecessary complexity for initial cohort.

## Decision 5: Reuse existing `VoiceRecorder` as-is

- Decision: Embed current `VoiceRecorder` component directly in dream submission UI with existing fallback behavior.
- Rationale: Clarification Q5 accepted this path. The component already handles live transcription + cloud fallback and error messaging.
- Alternatives considered:
  - New dream-specific wrapper: rejected for MVP because of duplicate behavior and maintenance overhead.

## Decision 6: Implement exact binomial test in server utility (no new heavy dependency)

- Decision: Add a small server-side statistics utility for exact binomial p-value against baseline $p=\frac{1}{23}$.
- Rationale: Keeps deployment footprint small while making calculations deterministic and testable.
- Alternatives considered:
  - Introduce scientific package: rejected for MVP to avoid dependency bloat.

## Decision 7: Analytics redaction is contract-level behavior

- Decision: For active runs, API returns only neutral progress metrics; inferential/comparative fields are omitted at serializer layer.
- Rationale: Prevents accidental UI leakage and enforces blinding at backend contract boundary.
- Alternatives considered:
  - Hide fields only in frontend: rejected due to security and leakage risk.

## Decision 8: Timezone policy is experiment-level anchor + participant-local mornings

- Decision: Nightly assignment anchor is 21:00 in earliest participant timezone; morning submission eligibility is evaluated in each participant's local timezone.
- Rationale: Matches accepted clarification and preserves consistent nightly protocol.
- Alternatives considered:
  - Per-participant nightly assignment: rejected because it changes experiment semantics and blinding windows.
