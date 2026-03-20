# Quickstart: Weekly Rhythms

**Date**: 2026-03-18  
**Feature**: [spec.md](./spec.md)

## Goal

Implement weekly celebrations and Thursday encouragements without changing product behavior during planning. This guide describes the intended build order once implementation starts.

## Prerequisites

- Use the existing Ta-Da! development environment.
- Do not start or restart the dev server from the terminal; the user controls it.
- Work from `app/` for all implementation commands.
- Reuse existing `users.email`, `users.timezone`, `rhythms`, `entries`, and rhythm calculation utilities.

## Suggested Implementation Order

### Phase 1: Schema and Domain Skeleton

1. Extend `app/server/db/schema.ts` with:
   - `weekly_rhythm_settings`
   - `weekly_stats_snapshots`
   - `weekly_messages`
   - `weekly_delivery_attempts`
2. Generate and apply the migration.
3. Add TypeScript domain types for tiers, channels, snapshot DTOs, and weekly message status.

Recommended commands:

```bash
cd app
bun run db:generate
bun run db:migrate
```

### Phase 2: Snapshot Generation

1. Create `server/services/weekly-rhythms/time.ts` for timezone-safe Monday and Thursday windows.
2. Create `server/services/weekly-rhythms/snapshots.ts` that:
   - aggregates entry counts by type
   - aggregates session duration by category
   - computes week-over-week deltas
   - computes monthly personal records
   - reuses rhythm calculators for per-rhythm wins and milestones
3. Add unit tests for quiet weeks, zero rhythms, and multi-rhythm snapshots.

Primary verification:

- Tier 1 facts match entry and rhythm data exactly.
- Snapshot generation is idempotent for the same user/week/kind.

### Phase 3: Tiered Rendering and Fallbacks

1. Create `renderer.ts`, `celebration.ts`, and `encouragement.ts` services.
2. Implement Tier 1 structured output first.
3. Add the cloud AI adapter for Tier 3 and Tier 4 using `WeeklyNarrativeInput` only.
4. Add a capability-gated private AI adapter for Tier 2 that falls back to Tier 1.
5. Add prompt tests and renderer tests covering:
   - factual cloud tier
   - creative cloud tier
   - private AI unavailable
   - quiet week language

### Phase 4: Scheduler and Delivery

1. Create `scheduler.ts` and `delivery.ts` services.
2. Add a Nitro server plugin that:
   - sweeps due generation work on startup
   - sweeps again on a fixed interval
   - processes delayed catch-up safely
3. Reuse `server/utils/email.ts` and add a weekly-rhythms email template file.
4. Persist channel attempts with retry state and auto-disable email after repeated failures.

Primary verification:

- Monday generation and Monday delivery are separate timestamps.
- Thursday encouragement remains available in-app even if email fails.
- AI failures downgrade to Tier 1 without user-visible errors.

### Phase 5: User APIs and UI

1. Add `GET/PUT /api/weekly-rhythms/settings`.
2. Add `GET /api/weekly-rhythms/current` and `GET /api/weekly-rhythms/history`.
3. Add `POST /api/weekly-rhythms/preview` for authenticated preview/testing.
4. Extend `app/pages/settings.vue` with a `WeeklyRhythmsSettings` section.
5. Add in-app `WeeklyEncouragementBanner` and `WeeklyCelebrationCard` components.

Primary verification:

- New users see all weekly features off by default.
- Cloud tiers require privacy acknowledgement.
- Email delivery cannot be enabled until a canonical account email exists.

### Phase 6: Hardening and Testing

1. Add API tests for settings, preview, unsubscribe, and current-content retrieval.
2. Add service tests for scheduler catch-up, retry backoff, and duplicate prevention.
3. Add optional Playwright coverage for onboarding and settings changes.
4. Run focused test files and one final non-interactive project validation pass.

## Key Files to Create

```text
app/server/api/weekly-rhythms/settings.get.ts
app/server/api/weekly-rhythms/settings.put.ts
app/server/api/weekly-rhythms/current.get.ts
app/server/api/weekly-rhythms/history.get.ts
app/server/api/weekly-rhythms/preview.post.ts
app/server/api/weekly-rhythms/messages/[id]/dismiss.post.ts
app/server/api/weekly-rhythms/unsubscribe/[token].get.ts
app/server/plugins/weekly-rhythms.ts
app/server/services/weekly-rhythms/time.ts
app/server/services/weekly-rhythms/snapshots.ts
app/server/services/weekly-rhythms/celebration.ts
app/server/services/weekly-rhythms/encouragement.ts
app/server/services/weekly-rhythms/renderer.ts
app/server/services/weekly-rhythms/delivery.ts
app/server/services/weekly-rhythms/scheduler.ts
app/server/services/weekly-rhythms/providers/cloudAi.ts
app/server/services/weekly-rhythms/providers/privateAi.ts
app/server/templates/weekly-rhythms-email.ts
app/composables/useWeeklyRhythms.ts
app/components/settings/WeeklyRhythmsSettings.vue
app/components/weekly-rhythms/WeeklyEncouragementBanner.vue
app/components/weekly-rhythms/WeeklyCelebrationCard.vue
```

## Testing Approach

Preferred test coverage:

- Unit: time window helpers, snapshot aggregation, tier fallback logic, privacy DTO redaction.
- Integration: Monday generation flow, Thursday encouragement flow, unsubscribe behavior, delayed catch-up.
- UI: settings onboarding, privacy notice acceptance, in-app banner/card rendering.

Recommended non-interactive commands during implementation:

```bash
cd app
bun run test:run server/services/weekly-rhythms/*.test.ts
bun run test:run server/api/weekly-rhythms/*.test.ts
```

If a focused type check is needed, prefer editor diagnostics or the Problems panel first. Run a full typecheck only near the end of the implementation phase.

## Implementation Checklist

- [ ] Schema supports opt-in settings, snapshots, messages, and delivery attempts
- [ ] Monday and Thursday schedules are computed in the user's timezone
- [ ] Tier 1 requires zero external API calls
- [ ] Tier 2, Tier 3, and Tier 4 all fall back safely to Tier 1
- [ ] Cloud AI payload never contains free text from entries
- [ ] Email template includes one-click unsubscribe
- [ ] In-app content remains available if email delivery fails
- [ ] Duplicate weekly messages are prevented per user/week/kind
- [ ] Quiet weeks produce gentle acknowledgement rather than empty output
- [ ] Zero-rhythm users still receive meaningful general progress summaries