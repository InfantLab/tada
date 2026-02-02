/**
 * POST /api/v1/import/insight-timer
 *
 * Import entries from Insight Timer CSV export
 * Uses pre-configured field mapping
 *
 * User Story 7: Historical Data Import
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { success, apiError, validationError } from "~/server/utils/response";
import {
  parseCSV,
  createPreview,
  importEntries,
  INSIGHT_TIMER_MAPPING,
} from "~/server/services/import";

// Import request schema for Insight Timer
const insightTimerRequestSchema = z.object({
  csvData: z.string().min(1),
  dryRun: z.boolean().default(false),
  skipDuplicates: z.boolean().default(true),
});

export default defineEventHandler(async (event) => {
  // Require entries:write permission
  requirePermission(event, "entries:write");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Parse and validate request body
  const body = await readBody(event);
  const parseResult = insightTimerRequestSchema.safeParse(body);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};

    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }

    throw createError(validationError(event, errors));
  }

  const { csvData, dryRun, skipDuplicates } = parseResult.data;

  try {
    // Parse CSV using Insight Timer preset mapping
    const parsedEntries = await parseCSV(csvData, INSIGHT_TIMER_MAPPING);

    if (parsedEntries.length === 0) {
      throw createError(
        apiError(event, "EMPTY_CSV", "No meditation sessions found in CSV", 400),
      );
    }

    // Dry run - return preview
    if (dryRun) {
      const preview = await createPreview(userId, parsedEntries);

      return success(event, {
        preview,
        message:
          "Preview of Insight Timer import. Set dryRun=false to execute import.",
        mapping: INSIGHT_TIMER_MAPPING,
      });
    }

    // Execute import
    const result = await importEntries(userId, parsedEntries, {
      skipDuplicates,
    });

    return success(event, {
      summary: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
      },
      message: `Imported ${result.created} meditation sessions from Insight Timer`,
      errors: result.errors,
    });
  } catch (error) {
    // Re-throw if already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Error importing Insight Timer data:", error);
    throw createError(
      apiError(
        event,
        "IMPORT_FAILED",
        error instanceof Error ? error.message : "Failed to import Insight Timer data",
        500,
      ),
    );
  }
});
