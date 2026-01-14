# Data Model: v0.2.0 Core Experience Completion

**Date**: 2026-01-14

## New Entities

### TimerPreset

Saved timer configurations for quick-start.

| Field        | Type      | Constraints             | Description                       |
| ------------ | --------- | ----------------------- | --------------------------------- |
| id           | string    | PK, UUID                | Unique identifier                 |
| userId       | string    | FK → users.id, NOT NULL | Owner                             |
| name         | string    | NOT NULL, max 50        | Display name ("Morning Sit")      |
| durationHint | integer   | nullable                | Suggested duration in seconds     |
| category     | string    | nullable                | Pre-selected category             |
| subcategory  | string    | nullable                | Pre-selected subcategory          |
| bellConfig   | JSON      | nullable                | Bell settings (intervals, sounds) |
| createdAt    | timestamp | NOT NULL                | Creation time                     |
| updatedAt    | timestamp | NOT NULL                | Last modification                 |

**Relationships**: Many presets → One user

### UserPreferences

Per-user customisation settings.

| Field            | Type      | Constraints           | Description                              |
| ---------------- | --------- | --------------------- | ---------------------------------------- |
| id               | string    | PK, UUID              | Unique identifier                        |
| userId           | string    | FK → users.id, UNIQUE | Owner (one row per user)                 |
| hiddenCategories | JSON      | DEFAULT []            | Categories hidden from pickers           |
| hiddenEntryTypes | JSON      | DEFAULT []            | Entry types hidden from journal          |
| customEmojis     | JSON      | DEFAULT {}            | Category/subcategory → emoji overrides   |
| customEntryTypes | JSON      | DEFAULT []            | User-defined entry types [{name, emoji}] |
| createdAt        | timestamp | NOT NULL              | Creation time                            |
| updatedAt        | timestamp | NOT NULL              | Last modification                        |

**Relationships**: One preferences → One user

## Modified Entities

### Entry (existing)

Add personal emoji field.

| Field | Type   | Change                                  |
| ----- | ------ | --------------------------------------- |
| emoji | string | NEW, nullable — personal emoji override |

**Display Logic**: Show `entry.emoji` if set, else look up category emoji from user preferences, else use default category emoji.

## Transient State (Not Persisted)

### UndoBuffer (client-side only)

| Field          | Type               | Description                         |
| -------------- | ------------------ | ----------------------------------- |
| deletedEntries | Entry[]            | Recently deleted entries            |
| expiresAt      | Map<id, timestamp> | When each entry expires from buffer |

**Lifecycle**:

1. On delete: move entry to buffer, set 30s expiry
2. On undo: restore entry via API, remove from buffer
3. On expiry: permanently delete via API, remove from buffer

## Indexes

```sql
-- Timer presets lookup
CREATE INDEX idx_timer_presets_user ON timer_presets(userId);

-- User preferences lookup (already unique on userId)
-- No additional index needed

-- Subcategory auto-complete
CREATE INDEX idx_entries_subcategory ON entries(userId, category, subcategory);
```

## Validation Rules

### TimerPreset

- `name`: Required, 1-50 characters, trimmed
- `durationHint`: If provided, must be > 0
- `bellConfig`: If provided, must be valid JSON matching bell schema

### UserPreferences

- `hiddenCategories`: Array of valid category strings
- `hiddenEntryTypes`: Array of valid entry type strings
- `customEmojis`: Object with string keys and emoji values
- `customEntryTypes`: Array of {name: string, emoji: string}

### Entry.emoji

- Single emoji character or short emoji sequence
- Optional (null means use category default)
