import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================================
// Users
// ============================================================================

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  username: text("username").notNull().unique(),
  email: text("email").unique(), // Optional for self-hosted, required for cloud
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
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
// Password Reset Tokens - For email-based password recovery
// ============================================================================

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(), // SHA-256 hash of the token
  expiresAt: text("expires_at").notNull(), // ISO 8601 - 6 hours from creation
  usedAt: text("used_at"), // When token was used (null if unused)
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Auth Events - Audit trail for authentication activities
// ============================================================================

export const authEvents = sqliteTable("auth_events", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for failed attempts
  eventType: text("event_type").notNull(), // login, logout, password_change, password_reset_request, password_reset_complete, login_failed
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
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
  type: text("type").notNull(), // 'timed', 'tally', 'moment', 'tada', etc.
  name: text("name").notNull(), // 'meditation', 'push-ups', 'dream', etc.

  // Category hierarchy (see design/ontology.md)
  category: text("category"), // 'mindfulness', 'accomplishment', 'creative', etc.
  subcategory: text("subcategory"), // 'sitting', 'work', 'piano', etc.
  emoji: text("emoji"), // Per-entry override (nullable)

  // =========================================================================
  // TIMELINE POSITION - Single source of truth
  // =========================================================================
  // `timestamp` is THE canonical field for timeline ordering.
  // - For timed activities: when the session STARTED
  // - For instant events: when it happened
  // - For imports: the original date/time from source data
  // NEVER use createdAt/updatedAt for timeline ordering.
  // =========================================================================
  timestamp: text("timestamp").notNull(), // ISO 8601 - THE timeline position
  durationSeconds: integer("duration_seconds"), // Duration in seconds (optional)
  timezone: text("timezone").notNull().default("UTC"), // Original timezone

  // Type-specific payload (JSON)
  data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),

  // Metadata
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  notes: text("notes"),

  // Import tracking
  source: text("source").notNull().default("manual"), // 'manual', 'import', 'strava', etc.
  externalId: text("external_id"), // ID from source for deduplication

  // Sync support (audit fields - NEVER for timeline)
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  deletedAt: text("deleted_at"), // Soft delete for sync
});

// ============================================================================
// Rhythms - Definitions that aggregate entries into patterns
// ============================================================================

export const rhythms = sqliteTable("rhythms", {
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

  // Graceful rhythm chains (v0.3.0+)
  // Minimum duration per day to count as "complete" (default 6 minutes)
  durationThresholdSeconds: integer("duration_threshold_seconds")
    .notNull()
    .default(360),

  // Chain type configuration (v0.3.1+)
  // Determines how chains are calculated and counted
  // - 'daily': Consecutive days with min duration - counted in days
  // - 'weekly_high': 5+ days/week with min duration - counted in weeks
  // - 'weekly_low': 3+ days/week with min duration - counted in weeks
  // - 'weekly_target': Cumulative minutes/week - counted in weeks
  // - 'monthly_target': Cumulative minutes/month - counted in months
  chainType: text("chain_type").notNull().default("weekly_low"), // Default to 3+ days/week

  // For target-based chains (weekly_target, monthly_target):
  // The cumulative minutes required per period
  chainTargetMinutes: integer("chain_target_minutes"),

  // Cached chain statistics for efficient incremental updates
  // Instead of recalculating from scratch, we track enough state to update incrementally
  cachedChainStats: text("cached_chain_stats", { mode: "json" }).$type<{
    // Chain data (new v0.3.1 format with type-based chains)
    chains: Array<{
      type: string; // ChainType
      current: number; // Current chain in appropriate unit
      longest: number; // All-time best
      unit: string; // 'days' | 'weeks' | 'months'
    }>;
    // For incremental updates: track the current chain's state
    currentChain: {
      lastCompleteDate: string | null; // Last date with a complete entry (YYYY-MM-DD)
      lastPeriodKey: string | null; // Week start (YYYY-MM-DD) or month (YYYY-MM)
      thisPeriodDays: number; // Completed days in the current period so far
      thisPeriodSeconds: number; // Total seconds this period
    };
    // Aggregate totals
    totals: {
      totalSessions: number;
      totalSeconds: number;
      totalHours: number;
      firstEntryDate: string | null;
      weeksActive: number;
      monthsActive: number;
    };
    // Cache metadata
    lastCalculatedAt: string;
    lastEntryTimestamp: string | null; // For detecting if full recalc needed
  }>(),

  // Panel display preferences (JSON)
  panelPreferences: text("panel_preferences", { mode: "json" })
    .$type<{
      showYearTracker: boolean;
      showMonthCalendar: boolean;
      showChainStats: boolean;
      monthViewMode: "calendar" | "linear";
      expandedByDefault: boolean;
    }>()
    .default({
      showYearTracker: true,
      showMonthCalendar: true,
      showChainStats: true,
      monthViewMode: "calendar",
      expandedByDefault: true,
    }),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Encouragements - Library of identity-based messages for rhythm chains
// ============================================================================

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
// NOTE: This table provides per-row storage for complex category customization.
// For simple emoji overrides, userPreferences.customEmojis is used instead.
// This table exists for future features like per-category colors, visibility,
// or other settings that benefit from individual row storage.
//
// Emoji storage strategy:
// - Category emoji: subcategory is NULL, emoji = category's custom emoji
// - Subcategory emoji: subcategory is set, emoji = that subcategory's custom emoji
// ============================================================================

export const categorySettings = sqliteTable("category_settings", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  category: text("category").notNull(), // 'mindfulness', 'accomplishment', etc.
  subcategory: text("subcategory"), // null = category-level setting, set = subcategory-level

  emoji: text("emoji"), // Override default emoji for this category OR subcategory
  color: text("color"), // Override default color (hex) - category-level only

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// User Preferences - Per-user customization settings
// ============================================================================

export const userPreferences = sqliteTable("user_preferences", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // Categories hidden from pickers
  hiddenCategories: text("hidden_categories", { mode: "json" })
    .$type<string[]>()
    .default([]),

  // Entry types hidden from journal add page
  hiddenEntryTypes: text("hidden_entry_types", { mode: "json" })
    .$type<string[]>()
    .default([]),

  // Custom emoji overrides for categories and subcategories
  // Key format:
  //   - Category emoji: "mindfulness" → "🪷"
  //   - Subcategory emoji: "mindfulness:sitting" → "🧘‍♂️"
  // These are user's global preferences that affect new entry emoji assignment
  customEmojis: text("custom_emojis", { mode: "json" })
    .$type<Record<string, string>>()
    .default({}),

  // User-defined entry types
  customEntryTypes: text("custom_entry_types", { mode: "json" })
    .$type<Array<{ name: string; emoji: string }>>()
    .default([]),

  // User-defined tally activity presets
  // Default: ['Press-ups', 'Squats', 'Pull-ups', 'Kettlebells']
  tallyPresets: text("tally_presets", { mode: "json" })
    .$type<Array<{ name: string; category?: string; emoji?: string }>>()
    .default([]),

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
// Import Recipes - Saved CSV column mappings for reuse
// ============================================================================

export const importRecipes = sqliteTable("import_recipes", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  name: text("name").notNull(), // "Insight Timer Import"
  description: text("description"),

  // Column mapping configuration (JSON)
  // Maps CSV column headers to entry fields
  columnMapping: text("column_mapping", { mode: "json" }).$type<{
    timestamp?: string; // CSV column name for date/time (maps to entries.timestamp)
    duration?: string; // CSV column name for duration
    name?: string;
    category?: string;
    subcategory?: string;
    notes?: string;
    tags?: string;
  }>(),

  // Transformation rules (JSON)
  transforms: text("transforms", { mode: "json" }).$type<{
    dateFormat?: string; // e.g., "MM/DD/YYYY HH:mm:ss"
    timezone?: string; // e.g., "America/New_York"
    durationFormat?: string; // e.g., "H:mm:ss"
    defaultCategory?: string;
    defaultSubcategory?: string;
    tagDelimiter?: string; // e.g., "," for comma-separated tags
  }>(),

  // Metadata
  isBuiltIn: integer("is_built_in", { mode: "boolean" }).default(false), // Insight Timer, etc.
  lastUsedAt: text("last_used_at"),
  useCount: integer("use_count").notNull().default(0),

  // Version history for rollback (stores last 3 versions)
  previousVersions: text("previous_versions", { mode: "json" })
    .$type<
      Array<{
        savedAt: string;
        columnMapping: Record<string, unknown>;
        transforms: Record<string, unknown>;
      }>
    >()
    .default([]),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================================
// Import Logs - Audit trail for data imports
// ============================================================================

export const importLogs = sqliteTable("import_logs", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  recipeId: text("recipe_id").references(() => importRecipes.id, {
    onDelete: "set null",
  }),
  recipeName: text("recipe_name").notNull(), // Snapshot at import time

  filename: text("filename").notNull(),
  source: text("source").notNull(), // 'insight-timer', 'strava', 'custom', etc.

  // Import results
  status: text("status").notNull(), // 'success', 'partial', 'failed'
  totalRows: integer("total_rows").notNull(),
  successfulRows: integer("successful_rows").notNull(),
  failedRows: integer("failed_rows").notNull(),
  skippedRows: integer("skipped_rows").notNull().default(0), // Duplicates

  // Error tracking (JSON)
  errors: text("errors", { mode: "json" })
    .$type<
      Array<{
        row: number;
        field?: string;
        message: string;
      }>
    >()
    .default([]),

  // Performance metrics
  durationMs: integer("duration_ms"),

  startedAt: text("started_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  completedAt: text("completed_at"),
});

// ============================================================================
// Entry Drafts - Partially complete entries awaiting confirmation
// ============================================================================

export const entryDrafts = sqliteTable("entry_drafts", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Draft content (JSON)
  input: text("input", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull(),

  // Voice context
  parsedFrom: text("parsed_from"), // Original transcribed text
  confidence: integer("confidence"), // 0-100 (stored as int, divide by 100)

  // Timestamps
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  expiresAt: text("expires_at").notNull(), // Auto-cleanup after 24h
});

// ============================================================================
// Activity History - For autocomplete suggestions
// ============================================================================

export const activityHistory = sqliteTable("activity_history", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Activity info
  activityName: text("activity_name").notNull(),
  category: text("category"),
  subcategory: text("subcategory"),
  entryType: text("entry_type").notNull(), // 'timed', 'reps', etc.

  // Usage tracking
  useCount: integer("use_count").notNull().default(1),
  lastUsedAt: text("last_used_at")
    .notNull()
    .default(sql`(datetime('now'))`),

  // Soft delete
  deletedAt: text("deleted_at"),
});

// ============================================================================
// Type exports for use in application code
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type AuthEvent = typeof authEvents.$inferSelect;
export type NewAuthEvent = typeof authEvents.$inferInsert;

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;

export type Rhythm = typeof rhythms.$inferSelect;
export type NewRhythm = typeof rhythms.$inferInsert;

export type Encouragement = typeof encouragements.$inferSelect;
export type NewEncouragement = typeof encouragements.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type CategorySetting = typeof categorySettings.$inferSelect;
export type NewCategorySetting = typeof categorySettings.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

export type TimerPreset = typeof timerPresets.$inferSelect;
export type NewTimerPreset = typeof timerPresets.$inferInsert;

export type ImportRecipe = typeof importRecipes.$inferSelect;
export type NewImportRecipe = typeof importRecipes.$inferInsert;

export type ImportLog = typeof importLogs.$inferSelect;
export type NewImportLog = typeof importLogs.$inferInsert;

export type EntryDraft = typeof entryDrafts.$inferSelect;
export type NewEntryDraft = typeof entryDrafts.$inferInsert;

export type ActivityHistory = typeof activityHistory.$inferSelect;
export type NewActivityHistory = typeof activityHistory.$inferInsert;
