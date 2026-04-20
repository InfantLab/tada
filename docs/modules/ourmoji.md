# Ourmoji

> ⚠️ **Restricted module — not on general release.**
> Ourmoji is gated behind a per-user feature flag and currently enabled only for a small group of collaborators. It is not part of the public Ta-Da! experience and may change or be removed without notice.

**A daily emoji oracle and shared dream experiment.**

Each morning an emoji is drawn from a Sacred Set and paired with a poetic reflection that references the moon phase and the Wheel of Year. On enrolled nights, paired participants run a structured dream-telepathy experiment: a Sender focuses on a target emoji before sleep, a Receiver records their dream and guesses the emoji the next morning.

## What it does

- **Daily Ourmoji** — A first-class daily entry showing today's emoji, reflection, moon phase, and Wheel of Year context
- **Calendar view** — Scrollable history of past Ourmojis as a grid, each tappable for full reflection
- **Dream experiments** — Multi-night runs pairing participants as Sender / Receiver / Control / Rest
- **Nightly assignment** — Roles assigned automatically at 21:00 in the earliest participant timezone, blinded to the Receiver
- **Morning dream capture** — Voice or text dream recording followed by an emoji guess, locked once submitted
- **Reveal flow** — After both participants submit, the target emoji is revealed alongside the recorded dream
- **Neutral progress stats** — During active runs only nights-completed and submission counts are shown; hit rates and p-values are hidden until the run finishes
- **Experiment management** — Create, pause, resume, and review experiment runs from a dedicated page

## Philosophy

Ourmoji is a research-flavoured ritual layer on top of Ta-Da!. Where the rest of the app celebrates everyday accomplishments, Ourmoji explores the symbolic and oneiric edge — daily oracles, shared dreams, and rigorously logged "what if?" experiments. It is intentionally narrow in audience: the goal is to learn from a small cohort before deciding whether anything here belongs in the general release.

## Access

Ourmoji is hidden unless the authenticated user has the `ourmoji` feature flag. Without the flag:

- No navigation entry appears
- API endpoints under `/api/ourmoji/**` return as if the feature does not exist
- No error or upsell is shown

### Enabling for a user

An admin can toggle module flags via the admin API:

```http
PATCH /api/v1/admin/users/:userId/modules
Content-Type: application/json

{ "ourmoji": true }
```

The body is a `Record<string, boolean>` — flags are merged into the user's existing `enabled_modules` preferences. Set a flag to `false` to disable it. The endpoint creates a `user_preferences` row automatically if the user doesn't have one yet.

Requires admin auth (`ADMIN_USER_IDS` env var) with `admin:users:write` permission.

## Module definition

| Field | Value |
|-------|-------|
| Types | `ourmoji`, `dream-experiment` |
| Label | Ourmoji |
| Status | Restricted (feature-flagged) |
| Requires | `ourmoji` feature flag |
| Notifications | Web Push (nightly assignment, morning prompt) |

## Code

| Path | Purpose |
|------|---------|
| `app/modules/entry-types/ourmoji/index.ts` | Daily Ourmoji entry type registration |
| `app/modules/entry-types/dream-experiment/index.ts` | Dream experiment entry type registration |
| `app/pages/ourmoji.vue` | Daily Ourmoji + calendar page |
| `app/pages/ourmoji/experiments.vue` | Experiment run management page |
| `app/components/ourmoji/` | Daily card, calendar, dream capture, reveal, experiment manager components |
| `app/composables/useOurmoji.ts` | Client state for daily + calendar |
| `app/composables/useDreamExperimentFlow.ts` | Client state for nightly assignment + morning flow |
| `app/server/api/ourmoji/` | REST endpoints (daily, calendar, experiments, submissions) |
| `app/server/services/ourmoji/` | Daily ingest, scheduling, randomization, notifications, submissions |
| `app/server/plugins/ourmoji-scheduler.ts` | Nitro plugin driving nightly assignment sweeps |
| `app/server/db/migrations/0023_ourmoji_module.sql` | Schema for experiments, assignments, submissions |
| `app/utils/ourmoji/` | Sacred Set + Wheel of Year helpers |

## Specification

Full design lives in [`specs/013-ourmoji-module/`](../../specs/013-ourmoji-module/) — see `spec.md`, `data-model.md`, and `contracts/openapi.yaml`.

---

[Back to modules](./README.md)
