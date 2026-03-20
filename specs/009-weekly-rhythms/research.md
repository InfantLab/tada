# Research: Weekly Rhythms

**Date**: 2026-03-18  
**Feature**: [spec.md](./spec.md)

## Technical Context Resolved

All planning unknowns from the initial template have been resolved against the repository's current rhythms, entries, settings, and email infrastructure.

### Existing Foundation Analysis

The feature can build on concrete existing pieces rather than starting from scratch:

- `app/server/db/schema.ts` already has `users.timezone`, `users.email`, `entries`, `rhythms`, and `encouragements`.
- `app/server/utils/rhythmCalculator.ts` and `app/utils/tierCalculator.ts` already calculate day completions, weekly progress, chain stats, totals, journey stage, and encouragement selection.
- `app/server/utils/email.ts` and `app/server/templates/email.ts` already provide SMTP-backed delivery and branded HTML/plain-text email rendering.
- `app/pages/settings.vue` and `app/server/api/auth/update-email.post.ts` already support email capture and account-level settings.
- The codebase has no existing recurring scheduler, weekly content persistence, or push-notification delivery infrastructure.

## Decisions

### Scheduling Architecture

**Decision**: Implement weekly rhythms with a database-backed due-work sweep run from a Nitro server plugin, using a direct `croner` dependency during implementation.

**Rationale**:

- The repository currently has no job runner, but it does run as a long-lived Nuxt server.
- A sweep loop is safer than per-user in-memory cron jobs because it survives restarts and supports catch-up after downtime.
- Persisting due work in the database enables idempotent generation, delayed delivery, and admin/test previews.

**Alternatives considered**:

- OS-level cron calling internal endpoints -> Rejected because it pushes essential app behavior outside the deployed application and complicates self-hosted setup.
- Per-user in-memory cron registrations -> Rejected because they would be fragile across restarts and timezone changes.
- On-read lazy generation only -> Rejected because the spec requires proactive Monday and Thursday delivery.

### Snapshot and Message Persistence

**Decision**: Persist immutable weekly stats snapshots and separately persist generated weekly messages plus channel delivery attempts.

**Rationale**:

- Tier fallback needs a stable, reusable input artifact.
- In-app banners and celebration cards should show exactly what was generated and emailed.
- Delivery retries, delayed sends, and auditability all require explicit message state rather than recomputing live.

**Alternatives considered**:

- Recompute content on every page load or send attempt -> Rejected because it risks content drift and duplicate work.
- Store only rendered email HTML -> Rejected because the app also needs structured in-app rendering and AI retry fallback.

### Reuse of Existing Analytics Logic

**Decision**: Reuse server-side rhythm and entry aggregation utilities directly from a new weekly-rhythms service instead of calling existing HTTP endpoints.

**Rationale**:

- Weekly generation is server-side domain logic, not client-driven API composition.
- Existing APIs are not designed for timezone-specific Monday-Sunday windows, partial Thursday-week calculations, or immutable snapshot generation.
- Direct service reuse avoids HTTP-to-self overhead and keeps type safety inside the server layer.

**Alternatives considered**:

- Compose `/api/entries/summary` and `/api/rhythms/*` internally via HTTP -> Rejected because it is slower, less type-safe, and harder to test.

### Canonical Email Address Strategy

**Decision**: Reuse `users.email` as the only canonical destination address; weekly-rhythm settings store channel opt-ins and unsubscribe state, not a second email address record.

**Rationale**:

- The repository already has account-level email update and verification flows.
- Duplicating delivery email in weekly settings invites drift between account identity and delivery destination.
- The onboarding requirement to "enter my email address" can be satisfied by embedding or invoking the existing email update flow from the weekly-rhythms settings section.

**Alternatives considered**:

- Add `weekly_email_address` to weekly settings -> Rejected because it duplicates user identity data and complicates unsubscribe semantics.

### AI Tier Rollout and Capability Gating

**Decision**: Ship Tier 1 first, implement Tier 3 and Tier 4 on the same cloud-AI adapter, and gate Tier 2 behind explicit instance capability detection with a Tier 1 fallback.

**Rationale**:

- The spec itself calls out uncertainty around local private AI availability.
- Tier 3 and Tier 4 differ mainly in prompt strategy, so they should share a provider abstraction and sanitized payload.
- Tier 1 must always exist as the fallback target for delivery reliability.

**Alternatives considered**:

- Block the whole feature on local AI research -> Rejected because it would delay the core weekly celebration value.
- Treat Tier 2 as equivalent to Tier 3 with different marketing copy -> Rejected because that would violate the privacy promise.

### Cloud AI Privacy Boundary

**Decision**: Build a normalized `WeeklyNarrativeInput` DTO containing only counts, durations, comparisons, record highlights, rhythm statuses, and milestone summaries. Never include notes, raw entry names from private moments, free-text content, dreams, or journal text.

**Rationale**:

- This enforces FR-026, FR-030, FR-043, and FR-044 at the service boundary.
- A single DTO can be reused for preview, generation, audit logging, and provider adapters.
- Limiting payload structure also reduces prompt-safety risk and hallucination surface area.

**Alternatives considered**:

- Let provider adapters inspect raw entries -> Rejected because it violates the feature's core privacy boundary.

### Delivery and Retry Strategy

**Decision**: Model weekly delivery like a small outbox system: one persisted message, channel-specific delivery attempt rows, exponential backoff for email retries, and in-app availability that does not depend on email success.

**Rationale**:

- The repository already uses retry patterns in `server/services/webhooks.ts`; weekly delivery can mirror that operational model.
- In-app content should remain visible even if email fails.
- A separate attempts table supports first-attempt metrics and retry observability.

**Alternatives considered**:

- Single boolean `emailSent` flag -> Rejected because it cannot express retry state, delayed recovery, or bounce history.

### Bounce Handling

**Decision**: Design for provider-aware bounce tracking: count immediate SMTP/provider send failures now, and add webhook/event ingestion for providers that emit asynchronous bounce events. Weekly settings will store a `consecutiveEmailFailures` counter and auto-disable email after three bounce-class failures.

**Rationale**:

- The feature spec requires disabling email after repeated bounce failures.
- Plain SMTP alone does not reliably provide asynchronous bounce feedback, so the implementation must abstract provider events.
- The auto-disable rule belongs in settings state, not only in transient send code.

**Alternatives considered**:

- Ignore bounce tracking for SMTP installs -> Rejected because it would knowingly miss a required behavior.
- Force a specific ESP now -> Rejected because the repository already supports SMTP generically and the feature should remain deployable across environments.

### Push Delivery Scope

**Decision**: Keep push delivery as a feature-flagged optional channel in the design, but do not make it part of the critical path for the first implementation phase.

**Rationale**:

- The current repository does not expose push subscription storage or a send pipeline.
- The spec marks push as `SHOULD` for encouragement, not `MUST`.
- The data model and contracts should leave room for push without blocking Monday celebrations and in-app banners.

**Alternatives considered**:

- Exclude push from the design entirely -> Rejected because the contract should stay extensible.

## Resulting Architecture Direction

The feature should be implemented as a weekly content subsystem with four layers:

1. Time + scheduling helpers that determine user-local Monday and Thursday windows.
2. Snapshot generation that aggregates general progress and rhythm wins into immutable records.
3. Tiered renderers that produce structured Tier 1 output or AI narratives from sanitized snapshot DTOs.
4. Delivery orchestration that persists in-app visibility and manages email retries, unsubscribe links, and future push support.