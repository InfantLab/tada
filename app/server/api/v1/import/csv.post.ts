/**
 * POST /api/v1/import/csv
 *
 * Import entries from CSV with custom field mapping
 *
 * User Story 7: Historical Data Import
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { success, apiError, validationError } from "~/server/utils/response";
import { parseCSV, createPreview, importEntries } from "~/server/services/import";

// Field mapping schema
const fieldMappingSchema = z.object({
  timestamp: z.string(),
  name: z.string(),
  type: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  durationSeconds: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
  timezone: z.string().optional(),
});

// Limits
const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_ROW_COUNT = 50_000;

// Import request schema
const importRequestSchema = z.object({
  csvData: z.string().min(1),
  fieldMapping: fieldMappingSchema,
  dryRun: z.boolean().default(false),
  skipDuplicates: z.boolean().default(true),
});

export default defineEventHandler(async (event) => {
  // Require entries:write permission
  requirePermission(event, "entries:write");

  const auth = event.context['auth']!;
  const userId = auth.userId;

  // Parse and validate request body
  const body = await readBody(event);
  const parseResult = importRequestSchema.safeParse(body);

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

  const { csvData, fieldMapping, dryRun, skipDuplicates } = parseResult.data;

  // Enforce maximum file size (5MB)
  const csvSizeBytes = new TextEncoder().encode(csvData).byteLength;
  if (csvSizeBytes > MAX_CSV_SIZE_BYTES) {
    throw createError(
      apiError(
        event,
        "CSV_TOO_LARGE",
        "CSV file exceeds maximum size of 5MB",
        413,
      ),
    );
  }

  try {
    // Parse CSV
    const parsedEntries = await parseCSV(csvData, fieldMapping);

    // Enforce maximum row count
    if (parsedEntries.length > MAX_ROW_COUNT) {
      throw createError(
        apiError(
          event,
          "CSV_TOO_MANY_ROWS",
          "CSV exceeds maximum of 50,000 rows",
          400,
        ),
      );
    }

    if (parsedEntries.length === 0) {
      throw createError(
        apiError(
          event,
          "EMPTY_CSV",
          "No entries found in CSV data",
          400,
        ),
      );
    }

    // Dry run - return preview
    if (dryRun) {
      const preview = await createPreview(userId, parsedEntries);

      return success(event, {
        preview,
        message: "Preview generated. Set dryRun=false to execute import.",
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
      errors: result.errors,
    });
  } catch (error) {
    // Re-throw if already a createError
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    console.error("Error importing CSV:", error);
    throw createError(
      apiError(
        event,
        "IMPORT_FAILED",
        error instanceof Error ? error.message : "Failed to import CSV",
        500,
      ),
    );
  }
});
