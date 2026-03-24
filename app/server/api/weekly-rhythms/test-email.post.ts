/**
 * POST /api/weekly-rhythms/test-email
 *
 * Generate and send a test weekly rhythm email.
 * - Authenticated users can send to themselves.
 * - Admins can send to any user by providing a userId.
 */

import * as z from "zod";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users, weeklyRhythmSettings } from "~/server/db/schema";
import { isAdmin } from "~/server/utils/admin";
import { renderCelebration } from "~/server/services/weekly-rhythms/celebration";
import { renderEncouragement } from "~/server/services/weekly-rhythms/encouragement";
import { deliverEmailForMessage } from "~/server/services/weekly-rhythms/delivery";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:weekly-rhythms:test-email");

const testEmailSchema = z.object({
  kind: z.enum(["celebration", "encouragement"]),
  userId: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const caller = event.context.user;
  if (!caller?.id) {
    throw createError(unauthorized(event));
  }

  const body = await readBody(event);
  const parsed = testEmailSchema.safeParse(body);

  if (!parsed.success) {
    throw createError(
      validationError(event, parsed.error.issues.map((i) => i.message)),
    );
  }

  const { kind, userId: targetUserId } = parsed.data;

  // Determine target user
  const targetId = targetUserId ?? caller.id;
  if (targetId !== caller.id && !isAdmin(caller.id)) {
    throw createError(forbidden(event, "Only admins can send test emails to other users"));
  }

  // Look up target user
  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, targetId),
  });
  if (!targetUser) {
    throw createError(validationError(event, ["User not found"]));
  }
  if (!targetUser.email) {
    throw createError(validationError(event, ["User has no email address configured"]));
  }

  // Check weekly rhythm settings exist
  const settings = await db.query.weeklyRhythmSettings.findFirst({
    where: eq(weeklyRhythmSettings.userId, targetId),
  });
  if (!settings) {
    throw createError(
      validationError(event, ["No weekly rhythm settings found. Enable weekly rhythms in Settings first."]),
    );
  }

  const timezone = targetUser.timezone ?? "UTC";
  const now = new Date();
  // Test emails preview last week's content, matching what the scheduler delivers
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Generate message
    let messageId: string;
    if (kind === "celebration") {
      const tier = (settings.celebrationTier as "stats_only" | "private_ai" | "cloud_factual" | "cloud_creative") ?? "stats_only";
      const result = await renderCelebration(targetId, tier, lastWeek, timezone);
      messageId = result.messageId;
    } else {
      const result = await renderEncouragement(targetId, lastWeek, timezone);
      messageId = result.messageId;
    }

    // Deliver via email
    const delivery = await deliverEmailForMessage(messageId, targetId);

    if (delivery.success) {
      logger.info("Test email sent", { kind, targetId, callerI: caller.id });
      return {
        success: true,
        kind,
        sentTo: targetUser.email,
        messageId,
      };
    }

    throw new Error(delivery.error ?? "Email delivery failed");
  } catch (error) {
    logger.error("Test email failed", error, { kind, targetId });
    throw createError(
      internalError(event, "We couldn't send the test email right now. Please try again later."),
    );
  }
});
