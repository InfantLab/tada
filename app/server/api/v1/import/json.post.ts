/**
 * POST /api/v1/import/json
 *
 * Import entries from JSON array
 *
 * User Story 7: Historical Data Import
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { success, apiError, validationError } from "~/server/utils/response";
import { createPreview, importEntries } from "~/server/services/import";

// JSON import request schema
const jsonImportRequestSchema = z.object({
  entries: z.array(z.record(z.any())).min(1),
  dryRun: z.boolean().default(false),
  skipDuplicates: z.boolean().default(true),
  updateExisting: z.boolean().default(false),
});

export default defineEventHandler(async (event) => {
  // Require entries:write permission
  requirePermission(event, "entries:write");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Parse and validate request body
  const body = await readBody(event);
  const parseResult = jsonImportRequestSchema.safeParse(body);

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

  const { entries, dryRun, skipDuplicates, updateExisting } = parseResult.data;

  try {
    // Dry run - return preview
    if (dryRun) {
      const preview = await createPreview(userId, entries);

      return success(event, {
        preview,
        message: "Preview generated. Set dryRun=false to execute import.",
      });
    }

    // Execute import
    const result = await importEntries(userId, entries, {
      skipDuplicates,
      updateExisting,
    });

    return success(event, {
      summary: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
      },
      errors: result.errors,
    });
  } catch (error) {
    // Re-throw if already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Error importing JSON:", error);
    throw createError(
      apiError(
        event,
        "IMPORT_FAILED",
        error instanceof Error ? error.message : "Failed to import JSON",
        500,
      ),
    );
  }
});
