import { randomUUID } from "crypto";
import { db } from "~/server/db";
import { entries, importLogs } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import { checkRateLimit } from "~/server/utils/rateLimiter";
import { inArray } from "drizzle-orm";

const logger = createLogger("api:import-entries");

// Batch size for database inserts - SQLite handles large batches well
const BATCH_SIZE = 1000;

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
    // Collect all externalIds for batch duplicate check
    const externalIds = entriesToImport
      .map((e: { externalId?: string }) => e.externalId)
      .filter((id: string | undefined): id is string => !!id);

    // Batch lookup of existing externalIds
    const existingExternalIds = new Set<string>();
    if (externalIds.length > 0) {
      // Check in batches to avoid SQL limits
      for (let i = 0; i < externalIds.length; i += 500) {
        const batchIds = externalIds.slice(i, i + 500);
        const existing = await db
          .select({ externalId: entries.externalId })
          .from(entries)
          .where(inArray(entries.externalId, batchIds));
        existing.forEach((e) => {
          if (e.externalId) existingExternalIds.add(e.externalId);
        });
      }
      logger.info("Duplicate check complete", {
        totalExternalIds: externalIds.length,
        existingCount: existingExternalIds.size,
      });
    }

    // Prepare all valid entries first
    const entriesToInsert: Array<{
      id: string;
      userId: string;
      type: string;
      name: string;
      category: string | null;
      subcategory: string | null;
      emoji: string | null;
      timestamp: string;
      durationSeconds: number | null;
      timezone: string;
      data: Record<string, unknown>;
      tags: string[];
      notes: string | null;
      source: string;
      externalId: string | null;
    }> = [];

    for (let i = 0; i < entriesToImport.length; i++) {
      const entryData = entriesToImport[i];

      // Skip duplicates
      if (
        entryData.externalId &&
        existingExternalIds.has(entryData.externalId)
      ) {
        results.skipped++;
        continue;
      }

      try {
        // timestamp is THE canonical timeline field - must be set
        const timestamp = entryData.timestamp || new Date().toISOString();

        entriesToInsert.push({
          id: randomUUID(),
          userId: user.id,
          type: entryData.type || "timed",
          name: entryData.name || "Imported Activity",
          category: entryData.category || null,
          subcategory: entryData.subcategory || null,
          emoji: entryData.emoji || null,
          timestamp,
          durationSeconds: entryData.durationSeconds || null,
          timezone: entryData.timezone || user.timezone || "UTC",
          data: entryData.data || {},
          tags: entryData.tags || [],
          notes: entryData.notes || null,
          source,
          externalId: entryData.externalId || null,
        });
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Batch insert all entries
    logger.info("Inserting entries", { count: entriesToInsert.length });

    for (let i = 0; i < entriesToInsert.length; i += BATCH_SIZE) {
      const batch = entriesToInsert.slice(i, i + BATCH_SIZE);
      try {
        await db.insert(entries).values(batch);
        results.successful += batch.length;
        logger.info("Batch inserted", {
          batchNum: Math.floor(i / BATCH_SIZE) + 1,
          batchSize: batch.length,
          totalProgress: results.successful,
        });
      } catch (error) {
        // If batch fails, try inserting one by one to identify problematic entries
        logger.warn("Batch insert failed, falling back to individual inserts", {
          batchStart: i,
          error: error instanceof Error ? error.message : String(error),
        });

        for (let j = 0; j < batch.length; j++) {
          try {
            await db.insert(entries).values(batch[j]!);
            results.successful++;
          } catch (insertError) {
            results.failed++;
            results.errors.push({
              row: i + j,
              message:
                insertError instanceof Error
                  ? insertError.message
                  : String(insertError),
            });
          }
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
