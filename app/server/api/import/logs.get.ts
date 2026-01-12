import { db } from "~/server/db";
import { importLogs } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:import-logs");

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  try {
    // Get all import logs for the user
    const logs = await db
      .select()
      .from(importLogs)
      .where(eq(importLogs.userId, user.id))
      .orderBy(desc(importLogs.startedAt))
      .limit(50); // Most recent 50 imports

    logger.info("Retrieved import logs", {
      userId: user.id,
      count: logs.length,
    });

    return {
      success: true,
      logs,
    };
  } catch (error) {
    logger.error("Failed to retrieve import logs", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });

    throw createError({
      statusCode: 500,
      message: "Failed to retrieve import logs",
    });
  }
});
