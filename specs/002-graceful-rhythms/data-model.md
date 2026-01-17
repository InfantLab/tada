# Data Model: Graceful Rhythm Chains

**Date**: 2026-01-17  
**Feature**: [spec.md](./spec.md)

## Entity Relationship Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    users     │────<│   rhythms    │     │  encouragements  │
└──────────────┘     └──────────────┘     └──────────────────┘
                            │
                            │ matches via
                            │ category/type
                            ▼
                     ┌──────────────┐
                     │   entries    │
                     └──────────────┘
```

## Schema Changes

### 1. Extend `rhythms` Table

Add new columns to existing `rhythms` table:

```typescript
// New columns to add via migration
durationThresholdSeconds: integer("duration_threshold_seconds").notNull().default(360), // 6 minutes
panelPreferences: text("panel_preferences", { mode: "json" }).$type<{
  showYearTracker: boolean;
  showMonthCalendar: boolean;
  showChainStats: boolean;
  monthViewMode: 'calendar' | 'linear';
  expandedByDefault: boolean;
}>().default({
  showYearTracker: true,
  showMonthCalendar: true,
  showChainStats: true,
  monthViewMode: 'calendar',
  expandedByDefault: true
}),
```

### 2. New `encouragements` Table

```typescript
export const encouragements = sqliteTable("encouragements", {
  id: text("id").primaryKey(), // UUID

  // Categorization
  stage: text("stage").notNull(), // 'starting', 'building', 'becoming'
  context: text("context").notNull(), // 'tier_achieved', 'streak_milestone', 'general', 'mid_week_nudge'
  activityType: text("activity_type").notNull().default("general"), // 'mindfulness', 'movement', 'general'

  // The message
  message: text("message").notNull(), // "You're becoming a meditator"

  // Optional: tier-specific messages
  tierName: text("tier_name"), // 'daily', 'most_days', 'few_times', 'weekly' (null = applies to all)

  // Metadata
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Encouragement = typeof encouragements.$inferSelect;
export type NewEncouragement = typeof encouragements.$inferInsert;
```

## Computed Types (Not Stored)

### FrequencyTier

```typescript
type TierName = "daily" | "most_days" | "few_times" | "weekly" | "starting";

interface FrequencyTier {
  name: TierName;
  label: string; // "Daily", "Most Days", etc.
  minDays: number; // 7, 5, 3, 1, 0
  maxDays: number; // 7, 6, 4, 2, 0
}

const TIERS: FrequencyTier[] = [
  { name: "daily", label: "Daily", minDays: 7, maxDays: 7 },
  { name: "most_days", label: "Most Days", minDays: 5, maxDays: 6 },
  { name: "few_times", label: "Few Times", minDays: 3, maxDays: 4 },
  { name: "weekly", label: "Weekly", minDays: 1, maxDays: 2 },
  { name: "starting", label: "Starting", minDays: 0, maxDays: 0 },
];
```

### RhythmProgress (API Response)

```typescript
interface DayStatus {
  date: string; // 'YYYY-MM-DD'
  totalSeconds: number;
  isComplete: boolean; // totalSeconds >= durationThresholdSeconds
  entryCount: number;
}

interface ChainStats {
  tier: TierName;
  current: number; // Current consecutive weeks at this tier
  longest: number; // Longest ever at this tier
}

interface RhythmProgress {
  rhythmId: string;

  // Current week status
  currentWeek: {
    startDate: string; // Monday of current week
    daysCompleted: number;
    achievedTier: TierName;
    bestPossibleTier: TierName; // What can still be achieved
    daysRemaining: number;
    nudgeMessage?: string; // Mid-week guidance
  };

  // Chain statistics (per tier)
  chains: ChainStats[];

  // Day-by-day data for visualizations
  days: DayStatus[]; // Last 2 years

  // Aggregate stats
  totals: {
    totalSessions: number;
    totalSeconds: number;
    totalHours: number;
    firstEntryDate: string;
    weeksActive: number;
  };

  // Identity messaging
  journeyStage: "starting" | "building" | "becoming";
  encouragement: string;
}
```

### RhythmSummary (List API Response)

```typescript
interface RhythmSummary {
  id: string;
  name: string;
  emoji?: string;

  // Quick stats for collapsed view
  currentTier: TierName;
  currentTierLabel: string;
  currentChainDays: number; // Days in current "daily" chain
  currentChainWeeks: number; // Weeks at current tier

  // Panel preferences
  panelPreferences: {
    showYearTracker: boolean;
    showMonthCalendar: boolean;
    showChainStats: boolean;
    monthViewMode: "calendar" | "linear";
    expandedByDefault: boolean;
  };
}
```

## Validation Rules

### Rhythm Creation

| Field                      | Rule                                 | Error Message                             |
| -------------------------- | ------------------------------------ | ----------------------------------------- |
| `name`                     | Required, 1-100 chars                | "Name is required"                        |
| `durationThresholdSeconds` | Min 0, Max 86400 (24h)               | "Duration must be between 0 and 24 hours" |
| `frequency`                | One of: 'daily', 'weekly', 'monthly' | "Invalid frequency"                       |
| `matchCategory`            | Required for timer rhythms           | "Category is required"                    |

### Encouragement

| Field     | Rule                                                                     | Error Message         |
| --------- | ------------------------------------------------------------------------ | --------------------- |
| `stage`   | One of: 'starting', 'building', 'becoming'                               | "Invalid stage"       |
| `context` | One of: 'tier_achieved', 'streak_milestone', 'general', 'mid_week_nudge' | "Invalid context"     |
| `message` | Required, 1-500 chars                                                    | "Message is required" |

## State Transitions

### Journey Stage

| Stage      | Criteria            | Transition                                                      |
| ---------- | ------------------- | --------------------------------------------------------------- |
| `starting` | Week 1 of practice  | → `building` after 1 full week                                  |
| `building` | Weeks 2-3           | → `becoming` after 3 consecutive weeks at "Few Times" or better |
| `becoming` | 4+ weeks consistent | Remains until 4+ weeks of no activity                           |

### Tier Achievement (Per Week)

| Days Completed | Tier Achieved           |
| -------------- | ----------------------- |
| 7              | Daily                   |
| 5-6            | Most Days               |
| 3-4            | Few Times               |
| 1-2            | Weekly                  |
| 0              | (no tier for this week) |

## Seed Data

### Default Encouragements

```typescript
const seedEncouragements = [
  // Starting stage
  {
    stage: "starting",
    context: "general",
    message: "Every journey begins with a single breath",
  },
  {
    stage: "starting",
    context: "general",
    message: "You've taken the first step. That's often the hardest one.",
  },
  {
    stage: "starting",
    context: "tier_achieved",
    tierName: "weekly",
    message: "You showed up this week. That matters.",
  },

  // Building stage
  {
    stage: "building",
    context: "general",
    message: "A practice is forming. You can feel it.",
  },
  {
    stage: "building",
    context: "tier_achieved",
    tierName: "most_days",
    message: "Most days is more than most people.",
  },
  {
    stage: "building",
    context: "streak_milestone",
    message: "Two weeks. The habit is taking root.",
  },

  // Becoming stage
  {
    stage: "becoming",
    context: "general",
    message: "You're becoming a meditator",
  },
  { stage: "becoming", context: "general", message: "This is who you are now" },
  {
    stage: "becoming",
    context: "tier_achieved",
    tierName: "daily",
    message: "Daily practice. You're living the life.",
  },
  {
    stage: "becoming",
    context: "streak_milestone",
    message: "Look how far you've come",
  },

  // Mid-week nudges (context-specific)
  {
    stage: "building",
    context: "mid_week_nudge",
    message: "{remaining} more times this week to hit {tier}",
  },
  {
    stage: "becoming",
    context: "mid_week_nudge",
    message: "Keep the momentum going—{remaining} to go",
  },
];
```

## Index Recommendations

```sql
-- For rhythm matching (finding entries for a rhythm)
CREATE INDEX idx_entries_user_category_timestamp
ON entries(user_id, category, timestamp);

-- For date range queries in progress calculation
CREATE INDEX idx_entries_user_timestamp
ON entries(user_id, timestamp);
```
