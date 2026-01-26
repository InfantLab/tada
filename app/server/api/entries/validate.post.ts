/**
 * POST /api/entries/validate
 *
 * Validate an entry input and check for time conflicts with existing entries.
 * Used to warn users before creating overlapping timed entries.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { entries } from "~/server/db/schema";
import { eq, and, ne, isNull, gte, lte } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";
import type {
  ConflictResult,
  OverlappingEntry,
  OverlapType,
} from "~/utils/entrySchemas";

const logger = createLogger("api:entries:validate");

interface ValidateBody {
  input: {
    type?: string;
    name?: string;
    timestamp?: string;
    durationSeconds?: number | null;
  };
  checkConflicts?: boolean;
  excludeEntryId?: string; // For editing existing entries
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ValidateBody>(event);

  // Require authentication
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const userId = event.context.user.id;
  const { input, checkConflicts = false, excludeEntryId } = body;

  // Default: no conflicts
  const result: ConflictResult = {
    hasConflict: false,
    overlappingEntries: [],
    suggestedResolution: "allow",
  };

  // Only check conflicts for timed entries with duration
  if (
    !checkConflicts ||
    input.type !== "timed" ||
    !input.timestamp ||
    !input.durationSeconds ||
    input.durationSeconds <= 0
  ) {
    return result;
  }

  try {
    // Calculate the time range of the new entry
    const newStart = new Date(input.timestamp);
    const newEnd = new Date(newStart.getTime() + input.durationSeconds * 1000);

    logger.debug("Checking for conflicts", {
      userId,
      timestamp: input.timestamp,
      durationSeconds: input.durationSeconds,
      newStart: newStart.toISOString(),
      newEnd: newEnd.toISOString(),
    });

    // Query for potentially overlapping timed entries
    // An overlap occurs when:
    // - New entry starts before existing entry ends, AND
    // - New entry ends after existing entry starts
    //
    // We need entries where:
    // - timestamp <= newEnd (existing starts before new ends)
    // - timestamp + duration >= newStart (existing ends after new starts)
    //
    // Since we can't do arithmetic in the query easily, we'll fetch
    // a broader range and filter in code

    // Fetch entries within a reasonable time window (24 hours before to 24 hours after)
    const windowStart = new Date(newStart.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(newEnd.getTime() + 24 * 60 * 60 * 1000);

    const conditions = [
      eq(entries.userId, userId),
      eq(entries.type, "timed"),
      isNull(entries.deletedAt),
      gte(entries.timestamp, windowStart.toISOString()),
      lte(entries.timestamp, windowEnd.toISOString()),
    ];

    // Exclude the current entry when editing
    if (excludeEntryId) {
      conditions.push(ne(entries.id, excludeEntryId));
    }

    const potentialOverlaps = await db
      .select({
        id: entries.id,
        name: entries.name,
        timestamp: entries.timestamp,
        durationSeconds: entries.durationSeconds,
        emoji: entries.emoji,
      })
      .from(entries)
      .where(and(...conditions));

    // Check each entry for actual overlap
    const overlappingEntries: OverlappingEntry[] = [];

    for (const existing of potentialOverlaps) {
      if (!existing.durationSeconds || existing.durationSeconds <= 0) {
        continue; // Skip entries without duration
      }

      const existingStart = new Date(existing.timestamp);
      const existingEnd = new Date(
        existingStart.getTime() + existing.durationSeconds * 1000,
      );

      // Check for overlap
      const overlaps = newStart < existingEnd && newEnd > existingStart;

      if (overlaps) {
        // Determine overlap type
        let overlapType: OverlapType;

        if (newStart <= existingStart && newEnd >= existingEnd) {
          // New entry completely contains existing
          overlapType = "contains";
        } else if (newStart >= existingStart && newEnd <= existingEnd) {
          // New entry is completely contained within existing
          overlapType = "contained";
        } else if (newStart < existingStart) {
          // New entry overlaps the start of existing
          overlapType = "partial-start";
        } else {
          // New entry overlaps the end of existing
          overlapType = "partial-end";
        }

        overlappingEntries.push({
          id: existing.id,
          name: existing.name,
          timestamp: existing.timestamp,
          durationSeconds: existing.durationSeconds,
          emoji: existing.emoji || undefined,
          overlapType,
        });
      }
    }

    if (overlappingEntries.length > 0) {
      logger.debug("Conflicts found", {
        userId,
        count: overlappingEntries.length,
      });

      result.hasConflict = true;
      result.overlappingEntries = overlappingEntries;

      // Suggest resolution based on overlap severity
      if (overlappingEntries.some((e) => e.overlapType === "contained")) {
        result.suggestedResolution = "warn";
      } else if (overlappingEntries.length > 2) {
        result.suggestedResolution = "warn";
      } else {
        result.suggestedResolution = "allow";
      }
    }

    return result;
  } catch (error) {
    logger.error("Failed to check conflicts", error);
    // On error, return no conflicts to avoid blocking the user
    return result;
  }
});
