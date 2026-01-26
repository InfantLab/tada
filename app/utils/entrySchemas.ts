/**
 * Entry Schemas
 *
 * Zod schemas for the unified entry system.
 * All entry sources (timer, quick add, voice, import) produce EntryInput.
 *
 * @module utils/entrySchemas
 */

import { z } from "zod";

// =============================================================================
// Entry Types
// =============================================================================

/**
 * Supported entry types
 * v0.3.0: Renamed journal → moment, reps → tally
 */
export const EntryTypeSchema = z.enum(["timed", "tally", "moment", "tada"]);
export type EntryType = z.infer<typeof EntryTypeSchema>;

/**
 * Entry source tracking
 */
export const EntrySourceSchema = z.enum(["manual", "voice", "import", "timer"]);
export type EntrySource = z.infer<typeof EntrySourceSchema>;

/**
 * Tada significance levels
 */
export const SignificanceSchema = z.enum(["minor", "normal", "major"]);
export type Significance = z.infer<typeof SignificanceSchema>;

// =============================================================================
// Core Input Schema
// =============================================================================

/**
 * Base object schema for entry input (without refinement)
 * Use this for .partial() and other schema operations
 */
export const EntryInputBaseSchema = z.object({
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
  significance: SignificanceSchema.optional(),

  // Journal-specific
  mood: z.number().int().min(1).max(5).optional(),
  themes: z.array(z.string()).optional(),

  // Metadata
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),

  // Tracking
  source: EntrySourceSchema.optional(),
  externalId: z.string().optional(), // For import deduplication

  // Additional data (type-specific payload)
  data: z.record(z.unknown()).optional(),
});

/**
 * Canonical input for creating entries - all sources produce this
 * Includes validation refinements for type-specific requirements
 */
export const EntryInputSchema = EntryInputBaseSchema.refine(
  (data) => {
    // Timed entries should have duration
    if (data.type === "timed" && !data.durationSeconds) {
      return false;
    }
    // Tally entries should have count
    if (data.type === "tally" && !data.count) {
      return false;
    }
    return true;
  },
  {
    message: "Timed entries require duration; tally entries require count",
  },
);

export type EntryInput = z.infer<typeof EntryInputSchema>;

// =============================================================================
// Conflict Detection Types
// =============================================================================

/**
 * Types of time overlaps
 */
export const OverlapTypeSchema = z.enum([
  "contains", // New entry completely contains existing
  "contained", // New entry is contained within existing
  "partial-start", // New entry overlaps start of existing
  "partial-end", // New entry overlaps end of existing
]);
export type OverlapType = z.infer<typeof OverlapTypeSchema>;

/**
 * Resolution strategies for conflicts
 */
export const ConflictResolutionSchema = z.enum([
  "allow-both", // Save both entries
  "keep-original", // Don't save new entry
  "replace", // Delete original, save new
]);
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>;

/**
 * Describes an overlapping entry
 */
export const OverlappingEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  timestamp: z.string(),
  durationSeconds: z.number().optional(),
  emoji: z.string().optional(),
  overlapType: OverlapTypeSchema,
});
export type OverlappingEntry = z.infer<typeof OverlappingEntrySchema>;

/**
 * Result from conflict detection
 */
export const ConflictResultSchema = z.object({
  hasConflict: z.boolean(),
  overlappingEntries: z.array(OverlappingEntrySchema),
  suggestedResolution: z.enum(["allow", "warn", "block"]),
});
export type ConflictResult = z.infer<typeof ConflictResultSchema>;

// =============================================================================
// Draft Entry Types
// =============================================================================

/**
 * Draft entry - partially complete entry awaiting confirmation
 */
export const DraftEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  input: EntryInputBaseSchema.partial(),
  parsedFrom: z.string().optional(), // Original voice text
  confidence: z.number().min(0).max(1).optional(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type DraftEntry = z.infer<typeof DraftEntrySchema>;

// =============================================================================
// Activity Suggestion Types
// =============================================================================

/**
 * Activity suggestion for autocomplete
 */
export const ActivitySuggestionSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  entryType: EntryTypeSchema,
  useCount: z.number().int(),
  lastUsedAt: z.string(),
});
export type ActivitySuggestion = z.infer<typeof ActivitySuggestionSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate entry input and return errors
 */
export function validateEntryInput(input: unknown): {
  valid: boolean;
  data?: EntryInput;
  errors: string[];
} {
  const result = EntryInputSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}

/**
 * Check if an entry type requires duration
 */
export function requiresDuration(type: EntryType): boolean {
  return type === "timed";
}

/**
 * Check if an entry type requires count
 */
export function requiresCount(type: EntryType): boolean {
  return type === "tally";
}
