/**
 * POST /api/feedback
 *
 * Receives user feedback and stores it in the database.
 * Public endpoint - no authentication required.
 */

import { z } from "zod";
import { db } from "~/server/db";
import { feedback } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:feedback");

const feedbackSchema = z.object({
  type: z.enum(["bug", "feedback", "question"]),
  description: z.string().min(10).max(5000),
  expectedBehavior: z.string().max(2000).optional(),
  email: z.string().email().optional(),
  systemInfo: z
    .object({
      userAgent: z.string(),
      platform: z.string(),
      language: z.string(),
      screenSize: z.string(),
      appVersion: z.string(),
      timestamp: z.string(),
    })
    .optional(),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validate input
  const parseResult = feedbackSchema.safeParse(body);
  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid feedback data",
      data: parseResult.error.issues,
    });
  }

  const feedbackData = parseResult.data;

  // Get user ID if authenticated (optional)
  const userId = event.context.user?.id || null;

  // Store feedback in database
  const feedbackId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(feedback).values({
    id: feedbackId,
    userId,
    type: feedbackData.type,
    description: feedbackData.description,
    expectedBehavior: feedbackData.expectedBehavior,
    email: feedbackData.email,
    systemInfo: feedbackData.systemInfo,
    status: "new",
    createdAt: now,
    updatedAt: now,
  });

  // Log for monitoring
  logger.info("Feedback stored", {
    id: feedbackId,
    type: feedbackData.type,
    userId,
    email: feedbackData.email,
    hasSystemInfo: !!feedbackData.systemInfo,
    descriptionLength: feedbackData.description.length,
  });

  return {
    success: true,
    message: "Thank you for your feedback!",
    id: feedbackId,
  };
});
