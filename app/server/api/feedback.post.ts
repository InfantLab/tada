/**
 * POST /api/feedback
 *
 * Receives user feedback and stores it.
 * Public endpoint - no authentication required.
 */

import { z } from "zod";
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

  const feedback = parseResult.data;

  // Get user ID if authenticated (optional)
  const userId = event.context.user?.id || null;

  // Log the feedback (in production, this would go to a database or support system)
  logger.info("Feedback received", {
    type: feedback.type,
    userId,
    email: feedback.email,
    hasSystemInfo: !!feedback.systemInfo,
    descriptionLength: feedback.description.length,
  });

  // For now, we log to console in a structured way
  // In production, you'd store this in a database table or send to a support system
  console.log("=== FEEDBACK RECEIVED ===");
  console.log("Type:", feedback.type);
  console.log("User ID:", userId || "anonymous");
  console.log("Email:", feedback.email || "not provided");
  console.log("Description:", feedback.description);
  if (feedback.expectedBehavior) {
    console.log("Expected:", feedback.expectedBehavior);
  }
  if (feedback.systemInfo) {
    console.log("System Info:", JSON.stringify(feedback.systemInfo, null, 2));
  }
  console.log("========================");

  return {
    success: true,
    message: "Thank you for your feedback!",
  };
});
