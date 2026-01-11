import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================================
// Users
// ============================================================================

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash"), // Null if no password set (open access)
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Sessions (for Lucia Auth)
// ============================================================================

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});

// ============================================================================
// Entries - The unified activity/event model
// ============================================================================

export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Type and identity
  type: text("type").notNull(), // 'timed', 'reps', 'journal', 'tada', etc.
  name: text("name").notNull(), // 'meditation', 'press-ups', 'dream', etc.

  // Category hierarchy (see design/ontology.md)
  category: text("category"), // 'mindfulness', 'accomplishment', 'creative', etc.
  subcategory: text("subcategory"), // 'sitting', 'work', 'piano', etc.
  emoji: text("emoji"), // Per-entry override (nullable)

  // Time handling (use whichever pattern fits)
  timestamp: text("timestamp"), // ISO 8601 - instant events
  startedAt: text("started_at"), // ISO 8601 - duration start
  endedAt: text("ended_at"), // ISO 8601 - duration end
  durationSeconds: integer("duration_seconds"), // Computed or manual
  date: text("date"), // YYYY-MM-DD - date-only events
  timezone: text("timezone").notNull().default("UTC"), // Original timezone

  // Type-specific payload (JSON)
  data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),

  // Metadata
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  notes: text("notes"),

  // Import tracking
  source: text("source").notNull().default("manual"), // 'manual', 'import', 'strava', etc.
  externalId: text("external_id"), // ID from source for deduplication

  // Sync support
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  deletedAt: text("deleted_at"), // Soft delete for sync
});

// ============================================================================
// Habits - Definitions that aggregate entries
// ============================================================================

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  name: text("name").notNull(), // "Daily Meditation"
  description: text("description"),

  // Direct matching fields (preferred, simpler than JSON matchers)
  matchType: text("match_type"), // e.g., 'timed'
  matchCategory: text("match_category"), // e.g., 'mindfulness'
  matchSubcategory: text("match_subcategory"), // e.g., 'sitting'
  matchName: text("match_name"), // e.g., 'meditation'

  // Legacy: JSON array of matchers (for complex cases)
  activityMatchers: text("activity_matchers", { mode: "json" }).$type<
    Array<{
      field: "name" | "type" | "tag" | "category";
      operator: "equals" | "contains" | "in";
      value: string | string[];
    }>
  >(),

  // Goal definition
  goalType: text("goal_type").notNull(), // 'boolean', 'duration', 'count'
  goalValue: integer("goal_value").notNull(), // e.g., 6 (minutes), 1 (completion)
  goalUnit: text("goal_unit"), // 'minutes', 'reps', etc.

  // Frequency
  frequency: text("frequency").notNull(), // 'daily', 'weekly', 'monthly'
  frequencyTarget: integer("frequency_target"), // For weekly: 3 = 3 days per week

  // Streak tracking (cached, recalculated periodically)
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastCompletedDate: text("last_completed_date"),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Attachments - Files associated with entries
// ============================================================================

export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(), // UUID
  entryId: text("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),

  type: text("type").notNull(), // 'photo', 'audio', 'gpx', 'file'
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path").notNull(), // Filesystem path or blob reference
  sizeBytes: integer("size_bytes"),

  // Type-specific metadata (JSON)
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Category Settings - User customization of category/subcategory display
// ============================================================================

export const categorySettings = sqliteTable("category_settings", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  category: text("category").notNull(), // 'mindfulness', 'accomplishment', etc.
  subcategory: text("subcategory"), // null = category-level setting

  emoji: text("emoji"), // Override default emoji
  color: text("color"), // Override default color (hex)

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Timer Presets - Saved meditation timer configurations
// ============================================================================

export const timerPresets = sqliteTable("timer_presets", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  name: text("name").notNull(), // "Morning Sit"
  durationSeconds: integer("duration_seconds"), // null = open-ended
  category: text("category").notNull(), // 'mindfulness', 'creative', etc.
  subcategory: text("subcategory").notNull(), // 'sitting', 'piano', etc.

  // Bell configuration (JSON)
  bellConfig: text("bell_config", { mode: "json" }).$type<{
    startBell?: string;
    endBell?: string;
    intervalBells?: Array<{ minutes: number; sound: string }>;
  }>(),

  backgroundAudio: text("background_audio"), // Audio file reference

  isDefault: integer("is_default", { mode: "boolean" }).default(false),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Type exports for use in application code
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type CategorySetting = typeof categorySettings.$inferSelect;
export type NewCategorySetting = typeof categorySettings.$inferInsert;

export type TimerPreset = typeof timerPresets.$inferSelect;
export type NewTimerPreset = typeof timerPresets.$inferInsert;
