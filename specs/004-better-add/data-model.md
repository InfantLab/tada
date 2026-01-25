# Data Model: Unified Entry System

**Feature**: 004-better-add  
**Date**: 2026-01-25

## Core Types

### EntryInput

The canonical input format that all entry sources produce.

```typescript
import { z } from "zod";

/**
 * Supported entry types
 */
export const EntryTypeSchema = z.enum(["timed", "reps", "journal", "tada"]);
export type EntryType = z.infer<typeof EntryTypeSchema>;

/**
 * Entry source tracking
 */
export const EntrySourceSchema = z.enum(["manual", "voice", "import", "timer"]);
export type EntrySource = z.infer<typeof EntrySourceSchema>;

/**
 * Canonical input for creating entries - all sources produce this
 */
export const EntryInputSchema = z
  .object({
    // Required
    type: EntryTypeSchema,
    name: z.string().min(1, "Name is required"),

    // Classification (optional)
    category: z.string().optional(),
    subcategory: z.string().optional(),
    emoji: z.string().optional(),

    // Timeline
    timestamp: z.string().datetime().optional(), // ISO 8601, defaults to now
    timezone: z.string().optional(), // Defaults to user's timezone

    // Type-specific fields
    durationSeconds: z.number().int().positive().optional(), // For timed
    count: z.number().int().positive().optional(), // For reps
    content: z.string().optional(), // For journal/tada

    // Timed-specific (optional, can be derived)
    startedAt: z.string().datetime().optional(),
    endedAt: z.string().datetime().optional(),

    // Tada-specific
    significance: z.enum(["minor", "normal", "major"]).optional(),

    // Journal-specific
    mood: z.number().int().min(1).max(5).optional(),
    themes: z.array(z.string()).optional(),

    // Metadata
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),

    // Tracking
    source: EntrySourceSchema.optional(),
    externalId: z.string().optional(), // For import deduplication
  })
  .refine(
    (data) => {
      // Timed entries should have duration
      if (data.type === "timed" && !data.durationSeconds) {
        return false;
      }
      // Reps entries should have count
      if (data.type === "reps" && !data.count) {
        return false;
      }
      return true;
    },
    {
      message: "Timed entries require duration; reps entries require count",
    },
  );

export type EntryInput = z.infer<typeof EntryInputSchema>;
```

### ConflictResult

Result from conflict detection.

```typescript
/**
 * Time overlap conflict detection result
 */
export interface ConflictResult {
  /** Whether any overlapping entries were found */
  hasConflict: boolean;

  /** List of entries that overlap with the proposed entry */
  overlappingEntries: Array<{
    id: string;
    name: string;
    timestamp: string;
    durationSeconds?: number;
    overlapType: "contains" | "contained" | "partial-start" | "partial-end";
  }>;

  /** Suggested resolution based on context */
  suggestedResolution: "allow" | "warn" | "block";
}

/**
 * Resolution strategy for conflicts
 */
export type ConflictResolution = "allow-both" | "keep-original" | "replace";
```

### DraftEntry

For persisting incomplete voice entries.

```typescript
/**
 * Draft entry - partially complete entry awaiting confirmation
 */
export const DraftEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),

  /** Partial entry data */
  input: EntryInputSchema.partial(),

  /** Original text if from voice */
  parsedFrom: z.string().optional(),

  /** Parsing confidence (0-1) */
  confidence: z.number().min(0).max(1).optional(),

  /** Creation timestamp */
  createdAt: z.string().datetime(),

  /** Auto-expiry timestamp (24h from creation) */
  expiresAt: z.string().datetime(),
});

export type DraftEntry = z.infer<typeof DraftEntrySchema>;
```

### RepsData

Data structure for count-based entries (stored in entries.data JSON field).

```typescript
/**
 * Data payload for reps-type entries
 */
export interface RepsData {
  /** Number of repetitions */
  count: number;

  /** Exercise/activity name (for auto-suggest) */
  exerciseName: string;

  /** Optional: weight used */
  weight?: number;
  weightUnit?: "kg" | "lb";

  /** Optional: sets completed */
  sets?: number;
}
```

### DurationParser

Types for the smart duration input parsing (see research.md for UX details).

````typescript
/**
 * Result of parsing a duration string
 */
export interface ParsedDuration {
  /** Duration in seconds */
  seconds: number;

  /** Original input string */
  input: string;

  /** Normalized display format ("1h 30m", "45m", "30s") */
  display: string;

  /** Parse confidence (1.0 = exact match, <1.0 = assumed) */
  confidence: number;
}

/**
 * Context for duration picker presets
 */
export type DurationContext = "meditation" | "exercise" | "work" | "general";

### CountPicker

Types for the count/reps input (harmonized with DurationPicker design).

```typescript
/**
 * Context for count picker presets
 */
export type CountContext = "bodyweight" | "weighted" | "cardio" | "general";

/**
 * Quick pick preset for counts
 */
export interface CountPreset {
  /** Count value */
  value: number;

  /** Display label */
  label: string;
}

/**
 * Context-aware preset configurations for counts
 */
export const COUNT_PRESETS: Record<CountContext, CountPreset[]> = {
  bodyweight: [
    { value: 10, label: "10" },
    { value: 15, label: "15" },
    { value: 20, label: "20" },
    { value: 25, label: "25" },
    { value: 30, label: "30" },
    { value: 40, label: "40" },
    { value: 50, label: "50" },
  ],
  weighted: [
    { value: 5, label: "5" },
    { value: 8, label: "8" },
    { value: 10, label: "10" },
    { value: 12, label: "12" },
    { value: 15, label: "15" },
    { value: 20, label: "20" },
  ],
  cardio: [
    { value: 10, label: "10" },
    { value: 20, label: "20" },
    { value: 30, label: "30" },
    { value: 50, label: "50" },
    { value: 100, label: "100" },
  ],
  general: [
    { value: 5, label: "5" },
    { value: 10, label: "10" },
    { value: 15, label: "15" },
    { value: 20, label: "20" },
    { value: 25, label: "25" },
    { value: 30, label: "30" },
  ],
};

/**
 * CountPicker component props
 */
export interface CountPickerProps {
  /** Current value */
  modelValue: number | null;

  /** Context for preset selection */
  context?: CountContext;

  /** Show user's recent counts */
  showRecent?: boolean;

  /** Override default presets */
  quickPicks?: number[];

  /** Minimum allowed count */
  min?: number;

  /** Maximum allowed count */
  max?: number;

  /** Enable mini-stepper controls */
  showStepper?: boolean;

  /** Unit label ("reps", "sets", etc.) */
  unit?: string;
}
````

### QuickValuePicker (Shared Base)

Shared base component for both DurationPicker and CountPicker.

```typescript
/**
 * Shared base component props for value pickers
 */
export interface QuickValuePickerProps {
  /** Current value */
  modelValue: number | null;

  /** Quick pick presets */
  quickPicks: number[];

  /** User's recent values */
  recentValues?: number[];

  /** Format value for display */
  formatValue: (n: number) => string;

  /** Parse string input to value */
  parseValue: (s: string) => number;

  /** Small step increment (±1 or ±1m) */
  stepSmall: number;

  /** Large step increment (±5 or ±5m) */
  stepLarge: number;

  /** Minimum allowed value */
  min?: number;

  /** Maximum allowed value */
  max?: number;

  /** Input placeholder */
  placeholder?: string;
}

/**
 * Quick pick preset
 */
export interface DurationPreset {
  /** Duration in seconds */
  value: number;

  /** Display label ("20m", "1h") */
  label: string;
}

/**
 * Context-aware preset configurations
 */
export const DURATION_PRESETS: Record<DurationContext, DurationPreset[]> = {
  meditation: [
    { value: 300, label: "5m" },
    { value: 600, label: "10m" },
    { value: 900, label: "15m" },
    { value: 1200, label: "20m" },
    { value: 1500, label: "25m" },
    { value: 1800, label: "30m" },
    { value: 2700, label: "45m" },
    { value: 3600, label: "1h" },
  ],
  exercise: [
    { value: 900, label: "15m" },
    { value: 1200, label: "20m" },
    { value: 1800, label: "30m" },
    { value: 2700, label: "45m" },
    { value: 3600, label: "1h" },
    { value: 5400, label: "90m" },
  ],
  work: [
    { value: 1500, label: "25m" }, // Pomodoro
    { value: 1800, label: "30m" },
    { value: 2700, label: "45m" },
    { value: 3600, label: "1h" },
    { value: 5400, label: "90m" },
    { value: 7200, label: "2h" },
  ],
  general: [
    { value: 300, label: "5m" },
    { value: 600, label: "10m" },
    { value: 900, label: "15m" },
    { value: 1200, label: "20m" },
    { value: 1800, label: "30m" },
    { value: 2700, label: "45m" },
    { value: 3600, label: "1h" },
  ],
};

/**
 * Duration picker component props
 */
export interface DurationPickerProps {
  /** Current value in seconds */
  modelValue: number | null;

  /** Context for preset selection */
  context?: DurationContext;

  /** Show user's recent durations */
  showRecent?: boolean;

  /** Override default presets (in seconds) */
  quickPicks?: number[];

  /** Minimum allowed duration (seconds) */
  minDuration?: number;

  /** Maximum allowed duration (seconds) */
  maxDuration?: number;

  /** Enable mini-stepper controls */
  showStepper?: boolean;
}
```

### Duration History (for "Recent" feature)

```sql
-- API endpoint will query entries for recent durations
-- GET /api/durations/recent
--
-- Returns aggregated unique durations used by user:
SELECT DISTINCT duration_seconds, COUNT(*) as use_count
FROM entries
WHERE user_id = ?
  AND duration_seconds IS NOT NULL
  AND deleted_at IS NULL
GROUP BY duration_seconds
ORDER BY MAX(created_at) DESC
LIMIT 5;
```

## Database Schema Changes

### Entry Drafts Table

```sql
-- New table for draft entries
CREATE TABLE entry_drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Draft content (JSON)
  input TEXT NOT NULL,      -- JSON: Partial<EntryInput>

  -- Voice context
  parsed_from TEXT,         -- Original transcribed text
  confidence REAL,          -- 0.0 to 1.0

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,

  -- Index for user lookup
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_entry_drafts_user ON entry_drafts(user_id);
CREATE INDEX idx_entry_drafts_expires ON entry_drafts(expires_at);
```

### Activity History Table (for autocomplete)

```sql
-- Track recently used activity names for autocomplete
CREATE TABLE activity_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Activity info
  activity_name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  entry_type TEXT NOT NULL,  -- 'timed', 'reps', etc.

  -- Usage tracking
  use_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Uniqueness
  UNIQUE(user_id, activity_name, entry_type)
);

CREATE INDEX idx_activity_history_user ON activity_history(user_id);
CREATE INDEX idx_activity_history_name ON activity_history(activity_name);
```

## Existing Schema (Reference)

The existing `entries` table already supports this feature:

```typescript
// From app/server/db/schema.ts
export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),

  type: text("type").notNull(), // 'timed', 'reps', 'journal', 'tada'
  name: text("name").notNull(),

  category: text("category"),
  subcategory: text("subcategory"),
  emoji: text("emoji"),

  timestamp: text("timestamp").notNull(),
  durationSeconds: integer("duration_seconds"), // Used for timed entries
  timezone: text("timezone").notNull().default("UTC"),

  // Type-specific data stored here (including 'count' for reps)
  data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),

  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  notes: text("notes"),

  source: text("source").notNull().default("manual"),
  externalId: text("external_id"),

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});
```

**Key Point**: For `reps` entries, the `count` is stored in the `data` JSON field as `{ count: number, exerciseName: string }`.
