import { randomUUID } from "crypto";
import { db } from "~/server/db";
import { entries, importLogs } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import { checkRateLimit } from "~/server/utils/rateLimiter";
import { eq } from "drizzle-orm";

const logger = createLogger("api:import-entries");

// Batch size for database inserts (500 rows per transaction)
const BATCH_SIZE = 500;

// Rate limit: 1 import per 10 seconds per user
const RATE_LIMIT_REQUESTS = 1;
const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  // Check rate limit
  if (!checkRateLimit(user.id, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
    logger.warn("Rate limit exceeded", { userId: user.id });
    throw createError({
      statusCode: 429,
      message:
        "Too many import requests. Please wait 10 seconds before trying again.",
    });
  }

  const body = await readBody(event);

  // Validate request body
  if (!body || !Array.isArray(body.entries) || body.entries.length === 0) {
    throw createError({
      statusCode: 400,
      message: "Request must include entries array",
    });
  }

  const {
    entries: entriesToImport,
    source = "import",
    recipeName = "Custom Import",
    recipeId = null,
    filename = "unknown.csv",
  } = body;

  const startTime = Date.now();
  const importLogId = randomUUID();

  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [] as Array<{
      row: number;
      field?: string;
      message: string;
    }>,
  };

  logger.info("Starting bulk import", {
    userId: user.id,
    totalRows: entriesToImport.length,
    source,
    recipeName,
  });

  try {
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < entriesToImport.length; i += BATCH_SIZE) {
      const batch = entriesToImport.slice(i, i + BATCH_SIZE);

      for (let j = 0; j < batch.length; j++) {
        const rowIndex = i + j;
        const entryData = batch[j];

        try {
          // Check for duplicate based on externalId
          if (entryData.externalId) {
            const existing = await db
              .select()
              .from(entries)
              .where(eq(entries.externalId, entryData.externalId))
              .limit(1);

            if (existing.length > 0) {
              logger.debug("Skipping duplicate entry", {
                externalId: entryData.externalId,
                row: rowIndex,
              });
              results.skipped++;
              continue;
            }
          }

          // Create entry
          const newEntry = {
            id: randomUUID(),
            userId: user.id,
            type: entryData.type || "timed",
            name: entryData.name || "Imported Activity",
            category: entryData.category,
            subcategory: entryData.subcategory,
            emoji: entryData.emoji,
            timestamp: entryData.timestamp,
            startedAt: entryData.startedAt,
            endedAt: entryData.endedAt,
            durationSeconds: entryData.durationSeconds,
            date: entryData.date,
            timezone: entryData.timezone || user.timezone || "UTC",
            data: entryData.data || {},
            tags: entryData.tags || [],
            notes: entryData.notes,
            source,
            externalId: entryData.externalId,
          };

          await db.insert(entries).values(newEntry);
          results.successful++;

          if (results.successful % 100 === 0) {
            logger.info("Import progress", {
              successful: results.successful,
              total: entriesToImport.length,
            });
          }
        } catch (error) {
          logger.error("Failed to import entry", {
            row: rowIndex,
            error: error instanceof Error ? error.message : String(error),
          });

          results.failed++;
          results.errors.push({
            row: rowIndex,
            message: error instanceof Error ? error.message : String(error),
          });

          // Continue processing other entries even if one fails
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // Log the import for audit trail
    await db.insert(importLogs).values({
      id: importLogId,
      userId: user.id,
      recipeId,
      recipeName,
      filename,
      source,
      status:
        results.failed === 0
          ? "success"
          : results.failed < entriesToImport.length
          ? "partial"
          : "failed",
      totalRows: entriesToImport.length,
      successfulRows: results.successful,
      failedRows: results.failed,
      skippedRows: results.skipped,
      errors: results.errors,
      durationMs,
      completedAt: new Date().toISOString(),
    });

    logger.info("Bulk import completed", {
      importLogId,
      successful: results.successful,
      failed: results.failed,
      skipped: results.skipped,
      durationMs,
    });

    return {
      success: true,
      importLogId,
      results: {
        total: entriesToImport.length,
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped,
        errors: results.errors.slice(0, 10), // Limit errors in response
      },
      durationMs,
    };
  } catch (error) {
    logger.error("Bulk import failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Try to log the failed import
    try {
      await db.insert(importLogs).values({
        id: importLogId,
        userId: user.id,
        recipeId,
        recipeName,
        filename,
        source,
        status: "failed",
        totalRows: entriesToImport.length,
        successfulRows: results.successful,
        failedRows: results.failed,
        skippedRows: results.skipped,
        errors: results.errors,
        durationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
      });
    } catch (logError) {
      logger.error("Failed to log import error", {
        error: logError instanceof Error ? logError.message : String(logError),
      });
    }

    throw createError({
      statusCode: 500,
      message: "Import failed",
      data: {
        successful: results.successful,
        failed: results.failed,
        errors: results.errors.slice(0, 10),
      },
    });
  }
});
