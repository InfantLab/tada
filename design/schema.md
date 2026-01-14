# Tada Database Schema

**Version:** 0.2.0  
**Last Updated:** January 14, 2026  
**Status:** Source of Truth

> This document is the authoritative reference for all database schemas. The actual implementation is in `app/server/db/schema.ts` and must match this specification.

---

## Core Design Principles

1. **Single Timeline Field**: Every entry has exactly one `timestamp` field that determines its position on the timeline. This is **never null**.
2. **Type-Specific Data**: The `data` JSON column holds type-specific fields. Keep the core schema minimal.
3. **Soft Deletes**: All user-facing tables use `deletedAt` for soft deletes to support sync.
4. **ISO 8601 Timestamps**: All datetime fields use ISO 8601 format with timezone.

---

## Tables

### entries

The unified activity/event model. Everything in Tada is an Entry.

| Column             | Type    | Nullable | Default  | Description                                                 |
| ------------------ | ------- | -------- | -------- | ----------------------------------------------------------- |
| `id`               | TEXT    | NO       | -        | UUID primary key                                            |
| `user_id`          | TEXT    | NO       | -        | FK to users.id                                              |
| `type`             | TEXT    | NO       | -        | Entry behavior: 'timed', 'tada', 'journal', 'reps', etc.    |
| `name`             | TEXT    | NO       | -        | Human label: "Morning Sit", "Fixed tap"                     |
| `category`         | TEXT    | YES      | NULL     | Life domain: 'mindfulness', 'accomplishment', 'creative'    |
| `subcategory`      | TEXT    | YES      | NULL     | Specific activity: 'sitting', 'work', 'piano'               |
| `emoji`            | TEXT    | YES      | NULL     | Per-entry emoji override                                    |
| **`timestamp`**    | TEXT    | **NO**   | -        | **ISO 8601 - THE canonical timeline position. NEVER NULL.** |
| `duration_seconds` | INTEGER | YES      | NULL     | Duration in seconds (for timed entries)                     |
| `timezone`         | TEXT    | NO       | 'UTC'    | Original timezone of the entry                              |
| `data`             | JSON    | YES      | {}       | Type-specific payload (see Type Payloads below)             |
| `tags`             | JSON    | YES      | []       | Freeform string tags                                        |
| `notes`            | TEXT    | YES      | NULL     | Markdown-supported notes                                    |
| `source`           | TEXT    | NO       | 'manual' | Origin: 'manual', 'import', 'strava', etc.                  |
| `external_id`      | TEXT    | YES      | NULL     | ID from source for deduplication                            |
| `created_at`       | TEXT    | NO       | now()    | Record creation time (audit only, NEVER for timeline)       |
| `updated_at`       | TEXT    | NO       | now()    | Record update time (audit only)                             |
| `deleted_at`       | TEXT    | YES      | NULL     | Soft delete timestamp                                       |

#### The `timestamp` Field

**`timestamp` is the ONLY field used for timeline ordering.**

- For **timed activities**: `timestamp` = when the session started
- For **instant events** (tada, journal): `timestamp` = when it happened
- For **imports**: `timestamp` = the original date/time from the source data
- For **date-only events**: `timestamp` = that date at 00:00:00 in user's timezone

**NEVER** fall back to `createdAt` for timeline ordering. **NEVER** use COALESCE patterns.

```typescript
// CORRECT: Always use timestamp directly
const entries = await db
  .select()
  .from(entries)
  .orderBy(desc(entries.timestamp));

// WRONG: Do not use COALESCE
// sql`COALESCE(started_at, timestamp, created_at)` ❌
```

#### Type-Specific Payloads (data field)

##### Timed Activities

```typescript
interface TimedData {
  targetDuration?: number; // Planned duration in seconds
  qualityRating?: number; // 1-5
  bellConfig?: BellConfig; // Timer sounds
}
```

##### Tada (Accomplishments)

```typescript
interface TadaData {
  content: string; // What was accomplished
  voiceTranscription?: string; // Original voice input
  significance?: "minor" | "normal" | "major";
}
```

##### Journal

```typescript
interface JournalData {
  content: string; // Markdown supported
  mood?: number; // 1-5
  themes?: string[]; // e.g., ['lucid', 'flying'] for dreams
}
```

##### Reps

```typescript
interface RepsData {
  count: number;
  sets?: number;
  exercise: string;
  weightKg?: number;
}
```

##### GPS Tracked

```typescript
interface GpsData {
  distanceMeters: number;
  elevationGainMeters?: number;
  averagePaceSecPerKm?: number;
  summaryPolyline?: string;
}
```

##### Measurement

```typescript
interface MeasurementData {
  metric: string; // 'body_weight', 'heart_rate'
  value: number;
  unit: string; // UCUM code preferred
  components?: Record<string, number>;
}
```

---

### users

User accounts.

| Column           | Type    | Nullable | Default | Description                                          |
| ---------------- | ------- | -------- | ------- | ---------------------------------------------------- |
| `id`             | TEXT    | NO       | -       | UUID primary key                                     |
| `username`       | TEXT    | NO       | -       | Unique username                                      |
| `email`          | TEXT    | YES      | NULL    | Email (required for cloud, optional for self-hosted) |
| `email_verified` | INTEGER | NO       | 0       | Boolean: email verified                              |
| `password_hash`  | TEXT    | YES      | NULL    | Argon2 hash (null = open access)                     |
| `timezone`       | TEXT    | NO       | 'UTC'   | User's default timezone                              |
| `created_at`     | TEXT    | NO       | now()   | -                                                    |
| `updated_at`     | TEXT    | NO       | now()   | -                                                    |

---

### sessions

Authentication sessions (Lucia Auth).

| Column       | Type    | Nullable | Default | Description            |
| ------------ | ------- | -------- | ------- | ---------------------- |
| `id`         | TEXT    | NO       | -       | Session ID primary key |
| `user_id`    | TEXT    | NO       | -       | FK to users.id         |
| `expires_at` | INTEGER | NO       | -       | Unix timestamp         |

---

### rhythms

Habit/rhythm tracking definitions.

| Column                | Type    | Nullable | Default | Description                    |
| --------------------- | ------- | -------- | ------- | ------------------------------ |
| `id`                  | TEXT    | NO       | -       | UUID primary key               |
| `user_id`             | TEXT    | NO       | -       | FK to users.id                 |
| `name`                | TEXT    | NO       | -       | "Daily Meditation"             |
| `description`         | TEXT    | YES      | NULL    | -                              |
| `match_type`          | TEXT    | YES      | NULL    | Match entries by type          |
| `match_category`      | TEXT    | YES      | NULL    | Match entries by category      |
| `match_subcategory`   | TEXT    | YES      | NULL    | Match entries by subcategory   |
| `match_name`          | TEXT    | YES      | NULL    | Match entries by name          |
| `activity_matchers`   | JSON    | YES      | NULL    | Complex matchers (legacy)      |
| `goal_type`           | TEXT    | NO       | -       | 'boolean', 'duration', 'count' |
| `goal_value`          | INTEGER | NO       | -       | Target value                   |
| `goal_unit`           | TEXT    | YES      | NULL    | 'minutes', 'reps', etc.        |
| `frequency`           | TEXT    | NO       | -       | 'daily', 'weekly', 'monthly'   |
| `frequency_target`    | INTEGER | YES      | NULL    | For weekly: days per week      |
| `current_streak`      | INTEGER | NO       | 0       | Cached streak count            |
| `longest_streak`      | INTEGER | NO       | 0       | Cached longest streak          |
| `last_completed_date` | TEXT    | YES      | NULL    | -                              |
| `created_at`          | TEXT    | NO       | now()   | -                              |
| `updated_at`          | TEXT    | NO       | now()   | -                              |

---

### timer_presets

Saved meditation timer configurations.

| Column             | Type    | Nullable | Default | Description          |
| ------------------ | ------- | -------- | ------- | -------------------- |
| `id`               | TEXT    | NO       | -       | UUID primary key     |
| `user_id`          | TEXT    | NO       | -       | FK to users.id       |
| `name`             | TEXT    | NO       | -       | "Morning Sit"        |
| `duration_seconds` | INTEGER | YES      | NULL    | null = open-ended    |
| `category`         | TEXT    | NO       | -       | Entry category       |
| `subcategory`      | TEXT    | NO       | -       | Entry subcategory    |
| `bell_config`      | JSON    | YES      | NULL    | Bell configuration   |
| `background_audio` | TEXT    | YES      | NULL    | Audio file reference |
| `is_default`       | INTEGER | NO       | 0       | Boolean              |
| `created_at`       | TEXT    | NO       | now()   | -                    |
| `updated_at`       | TEXT    | NO       | now()   | -                    |

---

### attachments

Files associated with entries.

| Column         | Type    | Nullable | Default | Description                     |
| -------------- | ------- | -------- | ------- | ------------------------------- |
| `id`           | TEXT    | NO       | -       | UUID primary key                |
| `entry_id`     | TEXT    | NO       | -       | FK to entries.id                |
| `type`         | TEXT    | NO       | -       | 'photo', 'audio', 'gpx', 'file' |
| `filename`     | TEXT    | NO       | -       | Original filename               |
| `mime_type`    | TEXT    | NO       | -       | MIME type                       |
| `storage_path` | TEXT    | NO       | -       | File path or blob reference     |
| `size_bytes`   | INTEGER | YES      | NULL    | File size                       |
| `metadata`     | JSON    | YES      | NULL    | Type-specific metadata          |
| `created_at`   | TEXT    | NO       | now()   | -                               |

---

### import_recipes

Saved CSV column mappings.

| Column              | Type    | Nullable | Default | Description            |
| ------------------- | ------- | -------- | ------- | ---------------------- |
| `id`                | TEXT    | NO       | -       | UUID primary key       |
| `user_id`           | TEXT    | NO       | -       | FK to users.id         |
| `name`              | TEXT    | NO       | -       | Recipe name            |
| `description`       | TEXT    | YES      | NULL    | -                      |
| `source_app`        | TEXT    | YES      | NULL    | 'insight_timer', etc.  |
| `column_mapping`    | JSON    | NO       | -       | Column → field mapping |
| `is_built_in`       | INTEGER | NO       | 0       | System recipe          |
| `previous_versions` | JSON    | YES      | NULL    | Rollback history       |
| `created_at`        | TEXT    | NO       | now()   | -                      |
| `updated_at`        | TEXT    | NO       | now()   | -                      |

---

### import_logs

Import audit trail.

| Column            | Type    | Nullable | Default | Description                      |
| ----------------- | ------- | -------- | ------- | -------------------------------- |
| `id`              | TEXT    | NO       | -       | UUID primary key                 |
| `user_id`         | TEXT    | NO       | -       | FK to users.id                   |
| `recipe_id`       | TEXT    | YES      | NULL    | FK to import_recipes.id          |
| `filename`        | TEXT    | NO       | -       | Source filename                  |
| `status`          | TEXT    | NO       | -       | 'pending', 'completed', 'failed' |
| `total_rows`      | INTEGER | NO       | 0       | Rows in file                     |
| `successful_rows` | INTEGER | NO       | 0       | Successfully imported            |
| `failed_rows`     | INTEGER | NO       | 0       | Failed to import                 |
| `skipped_rows`    | INTEGER | NO       | 0       | Skipped (duplicates)             |
| `errors`          | JSON    | YES      | NULL    | Error details                    |
| `started_at`      | TEXT    | NO       | now()   | -                                |
| `completed_at`    | TEXT    | YES      | NULL    | -                                |

---

## Indexes

```sql
CREATE INDEX idx_entries_user_timestamp ON entries(user_id, timestamp DESC);
CREATE INDEX idx_entries_user_type ON entries(user_id, type);
CREATE INDEX idx_entries_user_category ON entries(user_id, category);
CREATE INDEX idx_entries_external_id ON entries(external_id);
CREATE INDEX idx_rhythms_user ON rhythms(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

---

## See Also

- [SDR.md](SDR.md) - Software design requirements
- [ontology.md](ontology.md) - Category/subcategory hierarchy
- `app/server/db/schema.ts` - Drizzle ORM implementation
