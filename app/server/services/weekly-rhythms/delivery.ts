/**
 * Email delivery orchestration for weekly rhythms.
 *
 * Handles channel-level delivery with retry, backoff, and auto-disable
 * after repeated failures.
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { withRetry } from "~/server/db/operations";
import {
  weeklyRhythmSettings,
  systemMessages,
  systemMessageDeliveries,
  users,
} from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import { sendEmail, getAppUrl } from "~/server/utils/email";
import { generateUnsubscribeToken } from "~/server/utils/hmacTokens";
import {
  weeklyCelebrationEmail,
  weeklyEncouragementEmail,
} from "~/server/templates/weekly-rhythms-email";

const logger = createLogger("service:weekly-rhythms:delivery");

const MAX_EMAIL_FAILURES = 3;

/**
 * Compute backoff delay for email retries.
 * Attempt 1 → 1 hour, Attempt 2 → 4 hours, Attempt 3 → 24 hours.
 */
export function computeBackoffMs(attemptNumber: number): number {
  const hours = [1, 4, 24];
  return (hours[Math.min(attemptNumber - 1, 2)] ?? 24) * 60 * 60 * 1000;
}

/**
 * Deliver a weekly message via email.
 * Records delivery attempts and manages failure counters.
 */
export async function deliverEmailForMessage(
  messageId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  // Get the message
  const message = await withRetry(() =>
    db.query.systemMessages.findFirst({
      where: eq(systemMessages.id, messageId),
    }),
  );
  if (!message) {
    return { success: false, error: "Message not found" };
  }

  // Get user email
  const user = await withRetry(() =>
    db.query.users.findFirst({
      where: eq(users.id, userId),
    }),
  );
  if (!user?.email) {
    return { success: false, error: "No email address" };
  }

  // Check if email is disabled
  const settings = await withRetry(() =>
    db.query.weeklyRhythmSettings.findFirst({
      where: eq(weeklyRhythmSettings.userId, userId),
    }),
  );
  if (settings?.emailUnsubscribedAt) {
    return { success: false, error: "Email unsubscribed" };
  }

  // Build email content
  const tokenSecret = process.env["HMAC_SECRET"];
  if (!tokenSecret) {
    logger.error("HMAC_SECRET not configured");
    return { success: false, error: "Email delivery is not available right now. Please try again later." };
  }

  const { token } = generateUnsubscribeToken(userId, tokenSecret);
  const appUrl = getAppUrl();
  const unsubscribeUrl = `${appUrl}/api/weekly-rhythms/unsubscribe/${token}`;

  const emailInput = {
    title: message.title,
    summaryBlocks: message.summaryBlocks,
    narrativeText: message.narrativeText,
    weekStartDate: message.weekStartDate,
    unsubscribeUrl,
  };

  const template =
    message.kind === "celebration"
      ? weeklyCelebrationEmail(emailInput)
      : weeklyEncouragementEmail(emailInput);

  // Attempt send
  const now = new Date().toISOString();

  try {
    const sent = await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (!sent) {
      throw new Error("sendEmail returned false");
    }

    // Record successful delivery
    await withRetry(() =>
      db.insert(systemMessageDeliveries).values({
        id: crypto.randomUUID(),
        messageId,
        channel: "email",
        status: "sent",
        attemptNumber: 1,
        scheduledFor: now,
        attemptedAt: now,
        provider: "smtp",
        createdAt: now,
      }),
    );

    // Reset failure counter
    await withRetry(() =>
      db
        .update(weeklyRhythmSettings)
        .set({ consecutiveEmailFailures: 0, updatedAt: now })
        .where(eq(weeklyRhythmSettings.userId, userId)),
    );

    // Update message status
    await withRetry(() =>
      db
        .update(systemMessages)
        .set({ status: "delivered", deliveredAt: now, updatedAt: now })
        .where(eq(systemMessages.id, messageId)),
    );

    logger.info("Weekly email delivered", { messageId, userId });
    return { success: true };
  } catch (err) {
    const errorStr = String(err);
    const currentFailures = settings?.consecutiveEmailFailures ?? 0;
    const newFailureCount = currentFailures + 1;

    // Record failed attempt
    const backoffMs = computeBackoffMs(newFailureCount);
    const retryAfter = new Date(Date.now() + backoffMs).toISOString();

    await withRetry(() =>
      db.insert(systemMessageDeliveries).values({
        id: crypto.randomUUID(),
        messageId,
        channel: "email",
        status: newFailureCount >= MAX_EMAIL_FAILURES ? "failed" : "queued",
        attemptNumber: newFailureCount,
        scheduledFor: now,
        attemptedAt: now,
        retryAfter: newFailureCount < MAX_EMAIL_FAILURES ? retryAfter : null,
        failureCode: errorStr.substring(0, 50),
        failureMessage: errorStr.substring(0, 200),
        createdAt: now,
      }),
    );

    if (newFailureCount >= MAX_EMAIL_FAILURES) {
      // Auto-disable email delivery
      logger.error(
        `Email bounced ${MAX_EMAIL_FAILURES}x for user, auto-disabling`,
        { userId },
      );

      await withRetry(() =>
        db
          .update(weeklyRhythmSettings)
          .set({
            consecutiveEmailFailures: newFailureCount,
            lastEmailFailureAt: now,
            emailUnsubscribedAt: now,
            emailUnsubscribeSource: "bounce",
            updatedAt: now,
          })
          .where(eq(weeklyRhythmSettings.userId, userId)),
      );

      // Update message status
      await withRetry(() =>
        db
          .update(systemMessages)
          .set({ status: "failed", updatedAt: now })
          .where(eq(systemMessages.id, messageId)),
      );
    } else {
      // Record failure, schedule retry
      await withRetry(() =>
        db
          .update(weeklyRhythmSettings)
          .set({
            consecutiveEmailFailures: newFailureCount,
            lastEmailFailureAt: now,
            updatedAt: now,
          })
          .where(eq(weeklyRhythmSettings.userId, userId)),
      );
    }

    return { success: false, error: errorStr };
  }
}
