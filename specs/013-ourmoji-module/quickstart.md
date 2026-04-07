# Quickstart: Ourmoji Module

## Purpose

Validate the full Ourmoji MVP flow locally:

1. Daily Ourmoji ingestion + display
2. Experiment creation + nightly assignment trigger
3. Morning dream/guess/reveal with interruption-safe resume
4. Active-progress redaction and completed-run stats

## Prerequisites

- Branch: `013-ourmoji-module`
- Dev server already running by user (do not start from agent)
- Database migrated for new Ourmoji experiment tables
- Two test users with `enabledModules` including `ourmoji`

## 1) Apply schema changes

From `app/`:

```bash
bun run db:generate
bun run db:migrate
```

## 2) Verify daily Ourmoji upsert

Send sample payload:

```bash
curl -X POST http://localhost:3000/api/ourmoji/daily \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-03",
    "emoji": "octopus",
    "reflection": "The deep remembers what the daylight forgets.",
    "moonPhase": "Waxing Crescent",
    "moonIllumination": 21,
    "wheelOfYear": "World Octopus Day",
    "wheelCategory": "Cultural",
    "source": "api"
  }'
```

Checks:

- Repeat POST for same date updates existing entry (no duplicate)
- Enabled user sees panel + metadata
- Disabled user sees no Ourmoji affordances

## 3) Create experiment run

```bash
curl -X POST http://localhost:3000/api/ourmoji/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "April Dream Run",
    "startDate": "2026-04-03",
    "endDate": "2026-04-16",
    "participants": [
      { "userId": "user-a", "timezone": "Europe/London" },
      { "userId": "user-b", "timezone": "America/New_York" }
    ],
    "roleWeights": { "send": 0.5, "control": 0.3, "rest": 0.2 }
  }'
```

Checks:

- Run created in `scheduled` or `active`
- Adding participant already in active run returns conflict

## 4) Trigger nightly assignment

```bash
curl -X POST http://localhost:3000/api/ourmoji/experiments/<experimentId>/assignments/trigger
```

Checks:

- Exactly one assignment row per participant for night
- Re-trigger is idempotent (no duplicate rows)
- Sender payload includes target; receiver payload does not

## 5) Morning submission flow

Dream submission:

```bash
curl -X POST http://localhost:3000/api/ourmoji/submissions/<assignmentId>/dream \
  -H "Content-Type: application/json" \
  -d '{"dreamText":"I saw a lantern under water."}'
```

Guess submission:

```bash
curl -X POST http://localhost:3000/api/ourmoji/submissions/<assignmentId>/guess \
  -H "Content-Type: application/json" \
  -d '{"guessEmoji":"octopus","confidence":4}'
```

Checks:

- After dream submit, state is `dream_locked`
- Reopening app resumes at guess step
- After guess submit, reveal is deterministic and locked

## 6) Stats redaction behavior

Active run:

```bash
curl http://localhost:3000/api/ourmoji/experiments/<experimentId>/stats
```

Checks:

- Active run returns only progress metrics
- Completed run returns inferential stats (hit rate + p-value + breakdowns)

## 7) Test pass recommendation

From `app/`:

```bash
bun run test:run -- server/api/ourmoji
```

If targeted pattern is not available yet, run selected related files with `runTests` tool.
