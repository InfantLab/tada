/**
 * Conflict Detector
 *
 * Detects time overlaps between entries.
 * Used to warn users when creating entries that might conflict with existing ones.
 *
 * @module server/services/conflictDetector
 */

import { eq, and, gte, lte, isNull, or } from "drizzle-orm";
import { entries } from "../db/schema";
import { createLogger } from "../utils/logger";
import type {
  EntryInput,
  ConflictResult,
  OverlapType,
} from "~/utils/entrySchemas";

const logger = createLogger("conflict-detector");

// =============================================================================
// Types
// =============================================================================

export interface ConflictDetectorOptions {
  /** User ID to check against */
  userId: string;
  /** Entry being created/updated */
  input: EntryInput;
  /** Entry ID if updating (exclude from overlap check) */
  excludeEntryId?: string;
}

export interface OverlappingEntry {
  id: string;
  name: string;
  timestamp: string;
  durationSeconds?: number;
  overlapType: OverlapType;
}

// =============================================================================
// Conflict Detection
// =============================================================================

/**
 * Check for time conflicts with existing entries
 *
 * Overlap Definition: Entry A overlaps Entry B if:
 * - A.start < B.end AND A.end > B.start
 */
export async function checkConflicts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  options: ConflictDetectorOptions,
): Promise<ConflictResult> {
  const { userId, input, excludeEntryId } = options;

  // Only check timed entries with duration
  if (input.type !== "timed" || !input.durationSeconds) {
    return {
      hasConflict: false,
      overlappingEntries: [],
      suggestedResolution: "allow",
    };
  }

  const timestamp = input.timestamp || new Date().toISOString();
  const durationSeconds = input.durationSeconds;

  // Calculate start and end times
  const newStart = new Date(timestamp);
  const newEnd = new Date(newStart.getTime() + durationSeconds * 1000);

  // Find overlapping entries
  // An overlap occurs when:
  // existing.start < newEnd AND existing.end > newStart
  try {
    // Query for timed entries in a reasonable time window
    const windowStart = new Date(newStart.getTime() - 24 * 60 * 60 * 1000); // 24h before
    const windowEnd = new Date(newEnd.getTime() + 24 * 60 * 60 * 1000); // 24h after

    const conditions = and(
      eq(entries.userId, userId),
      eq(entries.type, "timed"),
      isNull(entries.deletedAt),
      gte(entries.timestamp, windowStart.toISOString()),
      lte(entries.timestamp, windowEnd.toISOString()),
    );

    // Exclude the entry being updated
    if (excludeEntryId) {
      // We can't use ne() easily, so we filter in JS
    }

    const candidates = await db
      .select({
        id: entries.id,
        name: entries.name,
        timestamp: entries.timestamp,
        durationSeconds: entries.durationSeconds,
      })
      .from(entries)
      .where(conditions);

    // Filter to actual overlaps
    const overlapping: OverlappingEntry[] = [];

    for (const entry of candidates) {
      if (excludeEntryId && entry.id === excludeEntryId) continue;
      if (!entry.durationSeconds) continue;

      const existingStart = new Date(entry.timestamp);
      const existingEnd = new Date(
        existingStart.getTime() + entry.durationSeconds * 1000,
      );

      // Check for overlap
      if (newStart < existingEnd && newEnd > existingStart) {
        const overlapType = determineOverlapType(
          newStart,
          newEnd,
          existingStart,
          existingEnd,
        );

        overlapping.push({
          id: entry.id,
          name: entry.name,
          timestamp: entry.timestamp,
          durationSeconds: entry.durationSeconds,
          overlapType,
        });
      }
    }

    if (overlapping.length === 0) {
      return {
        hasConflict: false,
        overlappingEntries: [],
        suggestedResolution: "allow",
      };
    }

    logger.info("Found overlapping entries", {
      newEntry: { timestamp, durationSeconds },
      overlappingCount: overlapping.length,
    });

    return {
      hasConflict: true,
      overlappingEntries: overlapping,
      // Default to warn - allow user to proceed
      suggestedResolution: "warn",
    };
  } catch (error) {
    logger.error("Failed to check conflicts", error);
    // On error, allow the entry (fail open)
    return {
      hasConflict: false,
      overlappingEntries: [],
      suggestedResolution: "allow",
    };
  }
}

/**
 * Determine the type of overlap between two time ranges
 */
function determineOverlapType(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date,
): OverlapType {
  // New entry completely contains existing
  if (newStart <= existingStart && newEnd >= existingEnd) {
    return "contains";
  }

  // New entry is completely contained within existing
  if (newStart >= existingStart && newEnd <= existingEnd) {
    return "contained";
  }

  // New entry overlaps start of existing
  if (
    newStart < existingStart &&
    newEnd > existingStart &&
    newEnd < existingEnd
  ) {
    return "partial-start";
  }

  // New entry overlaps end of existing
  return "partial-end";
}

/**
 * Format overlap for display
 */
export function formatOverlap(overlap: OverlappingEntry): string {
  const typeDescriptions: Record<OverlapType, string> = {
    contains: "completely covers",
    contained: "is within",
    "partial-start": "overlaps the start of",
    "partial-end": "overlaps the end of",
  };

  return `New entry ${typeDescriptions[overlap.overlapType]} "${overlap.name}"`;
}
