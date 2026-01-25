/**
 * Entry Engine
 *
 * Unified service for creating, validating, and managing entries.
 * All entry sources (timer, quick add, voice, import) use this service.
 *
 * @module server/services/entryEngine
 */

import { eq, and, gte, lte, isNull } from "drizzle-orm";
import type { Entry } from "../db/schema";
import { entries, activityHistory } from "../db/schema";
import { createLogger } from "../utils/logger";
import {
  validateEntryInput,
  type EntryInput,
  type ConflictResult,
  type ConflictResolution,
} from "~/utils/entrySchemas";
import {
  checkConflicts,
  type ConflictDetectorOptions,
} from "./conflictDetector";

const logger = createLogger("entry-engine");

// =============================================================================
// Types
// =============================================================================

export interface CreateEntryResult {
  success: boolean;
  entry?: Entry;
  error?: string;
  conflicts?: ConflictResult;
}

export interface CreateEntryOptions {
  /** How to handle time conflicts */
  resolution?: ConflictResolution;
  /** Skip conflict checking */
  skipConflictCheck?: boolean;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate entry input without saving
 */
export function validate(input: unknown): { valid: boolean; errors: string[] } {
  const result = validateEntryInput(input);
  return { valid: result.valid, errors: result.errors };
}

// =============================================================================
// Entry Creation
// =============================================================================

/**
 * Create a new entry
 *
 * @param db - Drizzle database instance
 * @param userId - User ID
 * @param input - Entry input data
 * @param options - Creation options
 */
export async function createEntry(
  db: Parameters<
    typeof entries._.columns.id.mapFromDriverValue
  >[0] extends never
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
  userId: string,
  input: EntryInput,
  options: CreateEntryOptions = {},
): Promise<CreateEntryResult> {
  // Validate input
  const validation = validateEntryInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join("; "),
    };
  }

  // Check for conflicts (unless skipped)
  let conflicts: ConflictResult | undefined;
  if (
    !options.skipConflictCheck &&
    input.type === "timed" &&
    input.durationSeconds
  ) {
    const conflictOptions: ConflictDetectorOptions = {
      userId,
      input,
    };
    conflicts = await checkConflicts(db, conflictOptions);

    // If blocking conflicts and no resolution specified
    if (conflicts.hasConflict && conflicts.suggestedResolution === "block") {
      if (!options.resolution || options.resolution === "keep-original") {
        return {
          success: false,
          error: "Entry conflicts with existing entries",
          conflicts,
        };
      }
    }
  }

  // Generate entry ID and prepare data
  const entryId = crypto.randomUUID();
  const now = new Date().toISOString();
  const timestamp = input.timestamp || now;

  // Build the data payload for type-specific fields
  const dataPayload: Record<string, unknown> = input.data
    ? { ...input.data }
    : {};

  // For reps entries, store count in data
  if (input.type === "reps" && input.count) {
    dataPayload["count"] = input.count;
    dataPayload["exerciseName"] = input.name;
  }

  // For journal entries, store content and mood
  if (input.type === "journal") {
    if (input.content) dataPayload["content"] = input.content;
    if (input.mood) dataPayload["mood"] = input.mood;
    if (input.themes) dataPayload["themes"] = input.themes;
  }

  // For tada entries, store significance
  if (input.type === "tada") {
    if (input.content) dataPayload["content"] = input.content;
    if (input.significance) dataPayload["significance"] = input.significance;
  }

  // For timed entries, store start/end times
  if (input.type === "timed") {
    if (input.startedAt) dataPayload["startedAt"] = input.startedAt;
    if (input.endedAt) dataPayload["endedAt"] = input.endedAt;
  }

  try {
    // Handle replace resolution (delete existing entries)
    if (options.resolution === "replace" && conflicts?.overlappingEntries) {
      for (const overlap of conflicts.overlappingEntries) {
        await db
          .update(entries)
          .set({ deletedAt: now })
          .where(eq(entries.id, overlap.id));
        logger.info("Replaced existing entry", { deletedId: overlap.id });
      }
    }

    // Insert the new entry
    const [newEntry] = await db
      .insert(entries)
      .values({
        id: entryId,
        userId,
        type: input.type,
        name: input.name,
        category: input.category,
        subcategory: input.subcategory,
        emoji: input.emoji,
        timestamp,
        timezone: input.timezone || "UTC",
        durationSeconds: input.durationSeconds,
        data: Object.keys(dataPayload).length > 0 ? dataPayload : null,
        tags: input.tags || [],
        notes: input.notes,
        source: input.source || "manual",
        externalId: input.externalId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    logger.info("Created entry", {
      id: entryId,
      type: input.type,
      name: input.name,
    });

    // Update activity history for autocomplete
    await updateActivityHistory(db, userId, input);

    return {
      success: true,
      entry: newEntry,
      conflicts,
    };
  } catch (error) {
    logger.error("Failed to create entry", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Activity History
// =============================================================================

/**
 * Update activity history for autocomplete suggestions
 */
async function updateActivityHistory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userId: string,
  input: EntryInput,
): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Try to update existing entry
    const result = await db
      .update(activityHistory)
      .set({
        useCount: 1, // Will be incremented with SQL
        lastUsedAt: now,
      })
      .where(
        and(
          eq(activityHistory.userId, userId),
          eq(activityHistory.activityName, input.name),
          eq(activityHistory.entryType, input.type),
        ),
      );

    // If no rows updated, insert new
    if (!result.rowsAffected || result.rowsAffected === 0) {
      await db.insert(activityHistory).values({
        id: crypto.randomUUID(),
        userId,
        activityName: input.name,
        category: input.category,
        subcategory: input.subcategory,
        entryType: input.type,
        useCount: 1,
        lastUsedAt: now,
      });
    }
  } catch (error) {
    // Non-critical - log and continue
    logger.warn("Failed to update activity history", { error });
  }
}

// =============================================================================
// Activity Suggestions
// =============================================================================

/**
 * Get activity suggestions for autocomplete
 */
export async function getSuggestions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userId: string,
  query: string,
  entryType?: string,
  limit = 10,
): Promise<
  Array<{
    name: string;
    category?: string;
    subcategory?: string;
    entryType: string;
    useCount: number;
    lastUsedAt: string;
  }>
> {
  try {
    // Build query conditions
    let conditions = and(
      eq(activityHistory.userId, userId),
      isNull(activityHistory.deletedAt),
    );

    if (entryType) {
      conditions = and(conditions, eq(activityHistory.entryType, entryType));
    }

    // Fetch all matching entries and filter client-side
    // (SQLite LIKE is case-insensitive by default)
    const results = await db
      .select()
      .from(activityHistory)
      .where(conditions)
      .orderBy(activityHistory.useCount)
      .limit(50);

    // Filter by query
    const lowerQuery = query.toLowerCase();
    const filtered = results
      .filter((r: { activityName: string }) =>
        r.activityName.toLowerCase().includes(lowerQuery),
      )
      .slice(0, limit)
      .map(
        (r: {
          activityName: string;
          category?: string;
          subcategory?: string;
          entryType: string;
          useCount: number;
          lastUsedAt: string;
        }) => ({
          name: r.activityName,
          category: r.category || undefined,
          subcategory: r.subcategory || undefined,
          entryType: r.entryType,
          useCount: r.useCount,
          lastUsedAt: r.lastUsedAt,
        }),
      );

    return filtered;
  } catch (error) {
    logger.error("Failed to get suggestions", error);
    return [];
  }
}

// =============================================================================
// Recent Durations / Counts
// =============================================================================

/**
 * Get user's recently used durations (for DurationPicker)
 */
export async function getRecentDurations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userId: string,
  limit = 5,
): Promise<number[]> {
  try {
    const results: Array<{ duration: number | null }> = await db
      .selectDistinct({ duration: entries.durationSeconds })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          eq(entries.type, "timed"),
          isNull(entries.deletedAt),
        ),
      )
      .orderBy(entries.createdAt)
      .limit(limit * 2); // Fetch more, dedupe

    // Get unique values
    const durations: number[] = results
      .map((r) => r.duration)
      .filter((d): d is number => d !== null);

    return [...new Set(durations)].slice(0, limit);
  } catch (error) {
    logger.error("Failed to get recent durations", error);
    return [];
  }
}

/**
 * Get user's recently used counts (for CountPicker)
 */
export async function getRecentCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userId: string,
  limit = 5,
): Promise<number[]> {
  try {
    const results: Array<{ data: { count?: number } | null }> = await db
      .select({ data: entries.data })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          eq(entries.type, "reps"),
          isNull(entries.deletedAt),
        ),
      )
      .orderBy(entries.createdAt)
      .limit(limit * 2);

    // Extract counts from data field
    const counts: number[] = results
      .map((r) => r.data?.count)
      .filter((c): c is number => typeof c === "number");

    return [...new Set(counts)].slice(0, limit);
  } catch (error) {
    logger.error("Failed to get recent counts", error);
    return [];
  }
}
