# Data Model: Weekly Rhythms

**Date**: 2026-03-18  
**Feature**: [spec.md](./spec.md)

## Entity Relationship Overview

```text
users
  |
  | 1:1
  v
weekly_rhythm_settings
  |
  | 1:N
  v
weekly_stats_snapshots
  |
  | 1:N
  v
weekly_messages
  |
  | 1:N
  v
weekly_delivery_attempts

users
  |
  | 1:N
  v
entries  ---> rhythms
             ^
             |
             +--- reused to compute rhythm wins inside weekly_stats_snapshots
```

## Design Notes

- `Weekly Celebration` and `Encouragement` remain distinct logical concepts, but they share the `weekly_messages` storage model via a `kind` field.
- `Weekly Stats Snapshot` is the canonical aggregation artifact. It is generated before any AI rendering so all tiers share the same factual base.
- The user's canonical email remains `users.email`; weekly settings only store whether email delivery is enabled, paused, or unsubscribed.

## Schema Changes

### 1. New `weekly_rhythm_settings` Table

One row per user. Stores opt-in state, tier choice, channel preferences, and email-failure counters.

```typescript
export const weeklyRhythmSettings = sqliteTable("weekly_rhythm_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  celebrationEnabled: integer("celebration_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  encouragementEnabled: integer("encouragement_enabled", { mode: "boolean" })
    .notNull()
    .default(false),

  celebrationTier: text("celebration_tier")
    .notNull()
    .default("stats_only"), // 'stats_only' | 'private_ai' | 'cloud_factual' | 'cloud_creative'

  deliveryChannels: text("delivery_channels", { mode: "json" }).$type<{
    celebration: { inApp: boolean; email: boolean; push: boolean };
    encouragement: { inApp: boolean; email: boolean; push: boolean };
  }>().notNull(),

  generationSchedule: text("generation_schedule", { mode: "json" }).$type<{
    encouragementLocalTime: string; // '15:03'
    celebrationGenerateLocalTime: string; // '03:33'
    celebrationDeliverLocalTime: string; // '08:08'
  }>().notNull(),

  onboardingCompletedAt: text("onboarding_completed_at"),
  cloudPrivacyAcknowledgedAt: text("cloud_privacy_acknowledged_at"),
  privateAiUnavailableDismissedAt: text("private_ai_unavailable_dismissed_at"),

  emailUnsubscribedAt: text("email_unsubscribed_at"),
  emailUnsubscribeSource: text("email_unsubscribe_source"), // 'email_link' | 'settings' | null
  consecutiveEmailFailures: integer("consecutive_email_failures")
    .notNull()
    .default(0),
  lastEmailFailureAt: text("last_email_failure_at"),

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

### 2. New `weekly_stats_snapshots` Table

Stores immutable factual aggregates for a user and weekly event.

```typescript
export const weeklyStatsSnapshots = sqliteTable("weekly_stats_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  kind: text("kind").notNull(), // 'celebration' | 'encouragement'
  weekStartDate: text("week_start_date").notNull(), // local Monday, YYYY-MM-DD
  weekEndDate: text("week_end_date").notNull(),     // local Sunday for celebrations
  timezone: text("timezone").notNull(),

  periodRange: text("period_range", { mode: "json" }).$type<{
    localStart: string;
    localEnd: string;
    utcStart: string;
    utcEnd: string;
  }>().notNull(),

  generalProgress: text("general_progress", { mode: "json" }).$type<{
    entryCountsByType: Record<string, number>;
    sessionDurationsByCategory: Record<string, number>;
    weekOverWeek: {
      entryCountDelta: number;
      durationDeltaSeconds: number;
      byType: Record<string, number>;
      byCategorySeconds: Record<string, number>;
    };
    personalRecordsThisMonth: Array<{
      type: string;
      label: string;
      value: number;
      unit: string;
      happenedAt: string;
    }>;
    quietWeek: boolean;
  }>().notNull(),

  rhythmWins: text("rhythm_wins", { mode: "json" }).$type<Array<{
    rhythmId: string;
    rhythmName: string;
    chainType: string;
    chainStatus: "maintained" | "extended" | "bending" | "broken" | "quiet";
    achievedTier: string;
    completedDays: number;
    totalSeconds: number;
    totalCount: number;
    allTimeMilestones: Array<{ label: string; value: number; unit: string }>;
    stretchGoal?: string;
  }>>().notNull(),

  encouragementContext: text("encouragement_context", { mode: "json" }).$type<{
    trailingFourWeekAverages: {
      totalEntries: number;
      totalDurationSeconds: number;
      byRhythmCompletedDays: Record<string, number>;
    };
    generalMomentum: "quiet" | "steady" | "ahead";
  }>(),

  generatedAt: text("generated_at").notNull(),
});
```

**Indexes / constraints**:

- Unique on `(userId, kind, weekStartDate)`.
- Index on `(kind, generatedAt)` for scheduler catch-up and history queries.

### 3. New `weekly_messages` Table

Stores rendered user-facing content and tier fallback results.

```typescript
export const weeklyMessages = sqliteTable("weekly_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  snapshotId: text("snapshot_id")
    .notNull()
    .references(() => weeklyStatsSnapshots.id, { onDelete: "cascade" }),

  kind: text("kind").notNull(), // 'celebration' | 'encouragement'
  weekStartDate: text("week_start_date").notNull(),

  tierRequested: text("tier_requested").notNull(),
  tierApplied: text("tier_applied").notNull(),
  fallbackReason: text("fallback_reason"),

  status: text("status").notNull().default("generated"),
  // 'generated' | 'queued' | 'delivered' | 'partially_delivered' | 'failed' | 'dismissed'

  title: text("title").notNull(),
  summaryBlocks: text("summary_blocks", { mode: "json" }).$type<Array<{
    section: "general_progress" | "rhythm_wins" | "stretch_goals" | "footer";
    heading: string;
    lines: string[];
  }>>().notNull(),
  narrativeText: text("narrative_text"),
  emailSubject: text("email_subject"),
  emailHtml: text("email_html"),
  emailText: text("email_text"),

  inAppVisibleFrom: text("in_app_visible_from").notNull(),
  scheduledDeliveryAt: text("scheduled_delivery_at"),
  deliveredAt: text("delivered_at"),
  dismissedAt: text("dismissed_at"),

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

**Indexes / constraints**:

- Unique on `(userId, kind, weekStartDate)` to prevent duplicate weekly artifacts.
- Index on `(status, scheduledDeliveryAt)` for due-send scanning.

### 4. New `weekly_delivery_attempts` Table

Channel-level audit trail and retry state.

```typescript
export const weeklyDeliveryAttempts = sqliteTable("weekly_delivery_attempts", {
  id: text("id").primaryKey(),
  messageId: text("message_id")
    .notNull()
    .references(() => weeklyMessages.id, { onDelete: "cascade" }),

  channel: text("channel").notNull(), // 'in_app' | 'email' | 'push'
  status: text("status").notNull(),   // 'queued' | 'sent' | 'failed' | 'bounced' | 'skipped'
  attemptNumber: integer("attempt_number").notNull(),

  scheduledFor: text("scheduled_for").notNull(),
  attemptedAt: text("attempted_at"),
  retryAfter: text("retry_after"),

  provider: text("provider"),
  providerMessageId: text("provider_message_id"),
  failureCode: text("failure_code"),
  failureMessage: text("failure_message"),
  rawResponse: text("raw_response", { mode: "json" }).$type<Record<string, unknown>>(),

  createdAt: text("created_at").notNull(),
});
```

## Derived Types

### WeeklyNarrativeInput

This is the only payload that may cross into AI rendering.

```typescript
interface WeeklyNarrativeInput {
  kind: "celebration" | "encouragement";
  weekLabel: string;
  timezone: string;
  generalProgress: {
    countsByType: Record<string, number>;
    durationByCategorySeconds: Record<string, number>;
    weekOverWeek: {
      entryCountDelta: number;
      durationDeltaSeconds: number;
      byType: Record<string, number>;
    };
    personalRecordsThisMonth: Array<{
      label: string;
      value: number;
      unit: string;
    }>;
    quietWeek: boolean;
  };
  rhythmWins: Array<{
    rhythmName: string;
    chainStatus: string;
    achievedTier: string;
    completedDays: number;
    milestones: string[];
    stretchGoal?: string;
  }>;
}
```

### CurrentWeeklySurface

```typescript
interface CurrentWeeklySurface {
  encouragement: WeeklyMessage | null;
  celebration: WeeklyMessage | null;
  settings: {
    celebrationEnabled: boolean;
    encouragementEnabled: boolean;
    celebrationTier: "stats_only" | "private_ai" | "cloud_factual" | "cloud_creative";
    emailEnabled: boolean;
  };
}
```

## Validation Rules

### WeeklyRhythmSettings

| Field | Rule | Error Message |
|------|------|---------------|
| `celebrationTier` | One of `stats_only`, `private_ai`, `cloud_factual`, `cloud_creative` | `Invalid celebration tier` |
| `deliveryChannels.*.*` | At least one celebration channel must remain enabled when celebrations are on | `Choose at least one celebration delivery method` |
| `deliveryChannels.*.*` | `email: true` requires `users.email` to be present | `Add an email address before enabling email delivery` |
| `cloudPrivacyAcknowledgedAt` | Required before enabling `cloud_factual` or `cloud_creative` | `Acknowledge the cloud privacy notice first` |

### WeeklyStatsSnapshot

| Field | Rule | Error Message |
|------|------|---------------|
| `weekStartDate` | ISO local date, Monday boundary for the user's timezone | `Invalid weekly boundary` |
| `kind` | `celebration` or `encouragement` | `Invalid snapshot kind` |
| `periodRange` | UTC range must correspond to local user window | `Snapshot period does not match timezone window` |

### WeeklyMessage

| Field | Rule | Error Message |
|------|------|---------------|
| `tierApplied` | Must be equal to or lower-privacy than `tierRequested` fallback chain | `Invalid tier fallback` |
| `emailHtml` / `emailText` | Required when email channel is queued | `Email content missing` |
| `scheduledDeliveryAt` | Required for email and push channels | `Scheduled delivery time missing` |

## State Transitions

### Message Lifecycle

| State | Trigger | Next State |
|------|---------|------------|
| `generated` | Scheduler creates content | `queued` |
| `queued` | All required channel rows created | `delivered` / `partially_delivered` / `failed` |
| `queued` | Email send fails but retry remains | `queued` |
| `delivered` | User dismisses banner/card | `dismissed` |
| `generated` | No deliverable channels and no in-app visibility required | `failed` |

### Email Delivery Health

| Current | Trigger | Next |
|--------|---------|------|
| `consecutiveEmailFailures = 0..2` | Send/bounce failure | `+1` |
| `consecutiveEmailFailures = 3` | Failure threshold reached | Email channel disabled, in-app notice created |
| `consecutiveEmailFailures > 0` | Successful email send | Reset to `0` |

## Mapping to Feature Requirements

- FR-001 to FR-006 map primarily to `weekly_stats_snapshots`.
- FR-007 to FR-015 map to `weekly_messages.kind = encouragement` plus channel records.
- FR-016 to FR-031 map to `weekly_messages` tiering and fallback fields.
- FR-032 to FR-037 map to `weekly_delivery_attempts` and `weekly_rhythm_settings` email state.
- FR-038 to FR-045 map to `weekly_rhythm_settings` validation and UI contract.