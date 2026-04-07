# Data Model: Ourmoji Module

## Overview

The model combines existing `entries` storage for timeline-visible content with dedicated experiment orchestration tables for strong integrity, scheduling, and analytics.

## Entities

## 1) Ourmoji Daily Entry (stored in `entries`)

- Storage: `entries` row with `type = "ourmoji"`
- Key fields:
  - `userId` (text, fk users.id)
  - `timestamp` (ISO datetime)
  - `timezone` (IANA tz)
  - `source` (`manual` | `api`)
  - `data` object:
    - `date` (YYYY-MM-DD)
    - `emoji` (string)
    - `reflection` (string)
    - `moonPhase` (string)
    - `moonIllumination` (number 0..100 | null)
    - `wheelOfYear` (string | null)
    - `wheelCategory` (string | null)
- Validation rules:
  - `emoji`, `reflection`, `moonPhase`, `date` required for API-origin entries
  - `moonIllumination` nullable; if present must be 0..100
  - upsert uniqueness by (`userId`, `data.date`, `type=ourmoji`)

## 2) experiment_runs

- Purpose: experiment lifecycle container
- Fields:
  - `id` (text pk UUID)
  - `name` (text, not null)
  - `status` (`scheduled` | `active` | `paused` | `completed`)
  - `startDate` (text YYYY-MM-DD)
  - `endDate` (text YYYY-MM-DD)
  - `earliestParticipantTimezone` (text, not null)
  - `roleWeights` (json: send/control/rest, normalized)
  - `randomizationSeed` (text or bigint string)
  - `createdBy` (text fk users.id)
  - `createdAt`, `updatedAt` (ISO datetime)
- Validation rules:
  - `startDate <= endDate`
  - weight sum must equal 1.0 (within epsilon)

## 3) experiment_participants

- Purpose: participant membership and anonymity mapping
- Fields:
  - `id` (text pk UUID)
  - `experimentRunId` (text fk experiment_runs.id)
  - `userId` (text fk users.id)
  - `anonymousLabel` (text, e.g., `participantA`)
  - `timezoneAtJoin` (text)
  - `joinedAt` (ISO datetime)
  - `leftAt` (ISO datetime nullable)
- Constraints:
  - unique (`experimentRunId`, `userId`)
  - partial uniqueness to prevent user in >1 active run (enforced by service guard)

## 4) experiment_night_assignments

- Purpose: immutable nightly role resolution
- Fields:
  - `id` (text pk UUID)
  - `experimentRunId` (text fk experiment_runs.id)
  - `nightDate` (text YYYY-MM-DD)
  - `participantId` (text fk experiment_participants.id)
  - `role` (`sender` | `receiver` | `control` | `rest`)
  - `targetEmoji` (text nullable)
  - `condition` (`send` | `control` | `rest`)
  - `assignmentSeed` (text)
  - `createdAt` (ISO datetime)
- Constraints:
  - unique (`experimentRunId`, `nightDate`, `participantId`)
  - exactly one assignment row per participant/night

## 5) experiment_submissions

- Purpose: receiver morning flow persistence with interruption-safe locking
- Fields:
  - `id` (text pk UUID)
  - `experimentRunId` (text fk experiment_runs.id)
  - `assignmentId` (text fk experiment_night_assignments.id)
  - `participantId` (text fk experiment_participants.id)
  - `dreamText` (text nullable)
  - `guessEmoji` (text nullable)
  - `guessConfidence` (integer nullable, 1..5)
  - `submissionState` (`none` | `dream_locked` | `complete`)
  - `isHit` (integer boolean nullable)
  - `revealedAt` (ISO datetime nullable)
  - `dreamLockedAt` (ISO datetime nullable)
  - `guessLockedAt` (ISO datetime nullable)
  - `createdAt`, `updatedAt`
- Constraints:
  - unique (`assignmentId`) for receiver/control role rows
  - if `submissionState = complete` then `guessEmoji` must be non-null

## 6) experiment_notification_deliveries

- Purpose: channel-level delivery audit and retries
- Fields:
  - `id` (text pk UUID)
  - `assignmentId` (text fk experiment_night_assignments.id)
  - `channel` (`email` | `push`)
  - `status` (`queued` | `sent` | `failed`)
  - `attemptNumber` (integer)
  - `scheduledFor` (ISO datetime)
  - `attemptedAt` (ISO datetime nullable)
  - `failureCode` (text nullable)
  - `failureMessage` (text nullable)
  - `createdAt` (ISO datetime)

## Derived Models

## ExperimentStatisticsView (computed)

- Source: `experiment_submissions` + `experiment_night_assignments`
- Fields:
  - totals (`nightsCompleted`, `guesses`, `hits`, `hitRate`)
  - baseline (`chanceRate = 1/23`)
  - `binomialPValue`
  - breakdowns (`byCondition`, `byParticipantAnon`, `byEmoji`, `byMoonPhase`)
- Active run redaction:
  - return only `nightsCompleted`, `submissionCount`, `nightsRemaining`

## Relationships

- `experiment_runs` 1->many `experiment_participants`
- `experiment_runs` 1->many `experiment_night_assignments`
- `experiment_night_assignments` 1->0/1 `experiment_submissions`
- `experiment_night_assignments` 1->many `experiment_notification_deliveries`

## State Transitions

## Experiment run state

- `scheduled -> active` on start-date activation
- `active -> paused` via management API
- `paused -> active` via resume API
- `active|paused -> completed` at end date or explicit close

## Submission state

- `none -> dream_locked` on successful dream submission
- `dream_locked -> complete` on guess submission
- No reverse transitions allowed
