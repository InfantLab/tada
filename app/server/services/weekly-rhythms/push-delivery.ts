/**
 * Push notification delivery for weekly rhythms.
 *
 * Mirrors the email delivery pattern, iterating over all active
 * push_subscriptions for a user and recording delivery outcomes.
 */

import { and, eq, isNull } from "drizzle-orm";
import { db } from "~/server/db";
import { withRetry } from "~/server/db/operations";
import {
  pushSubscriptions,
  systemMessages,
  systemMessageDeliveries,
} from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import { sendPushNotification } from "~/server/utils/push";

const logger = createLogger("service:weekly-rhythms:push-delivery");

/**
 * Deliver a weekly rhythm message via push notifications.
 * Iterates all active subscriptions for the user, records delivery rows.
 */
export async function deliverPushForMessage(
  messageId: string,
  userId: string,
): Promise<void> {
  const message = await withRetry(() =>
    db.query.systemMessages.findFirst({
      where: eq(systemMessages.id, messageId),
    }),
  );
  if (!message) {
    logger.warn("Push delivery: message not found", { messageId });
    return;
  }

  // Look up active subscriptions
  const subs = await withRetry(() =>
    db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          isNull(pushSubscriptions.disabledAt),
        ),
      ),
  );

  if (subs.length === 0) {
    logger.debug("No active push subscriptions for user", { userId });
    return;
  }

  // Build the notification payload
  const title =
    message.kind === "celebration"
      ? "Ta-Da! Weekly Celebration"
      : "Ta-Da! Weekly Check-in";

  const rawBody = message.narrativeText ?? message.title ?? "";
  const body = rawBody.length > 100 ? rawBody.substring(0, 97) + "..." : rawBody || title;

  const payload = {
    title,
    body,
    data: { messageId, url: "/rhythms" },
  };

  const now = new Date().toISOString();
  let successCount = 0;
  let failureCount = 0;

  for (const sub of subs) {
    try {
      await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );

      // Record success
      await withRetry(() =>
        db.insert(systemMessageDeliveries).values({
          id: crypto.randomUUID(),
          messageId,
          channel: "push",
          status: "sent",
          attemptNumber: 1,
          scheduledFor: now,
          attemptedAt: now,
          provider: "vapid",
          createdAt: now,
        }),
      );

      // Update lastUsedAt
      await withRetry(() =>
        db
          .update(pushSubscriptions)
          .set({ lastUsedAt: now })
          .where(eq(pushSubscriptions.id, sub.id)),
      );

      successCount++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;

      if (statusCode === 410) {
        // Subscription expired — soft disable
        logger.info("Push subscription expired (410), disabling", {
          subscriptionId: sub.id,
          userId,
        });
        await withRetry(() =>
          db
            .update(pushSubscriptions)
            .set({ disabledAt: now })
            .where(eq(pushSubscriptions.id, sub.id)),
        );
      } else {
        logger.error("Push notification failed", err as Error, {
          subscriptionId: sub.id,
          userId,
        });
      }

      const errStr = String(err);
      await withRetry(() =>
        db.insert(systemMessageDeliveries).values({
          id: crypto.randomUUID(),
          messageId,
          channel: "push",
          status: "failed",
          attemptNumber: 1,
          scheduledFor: now,
          attemptedAt: now,
          provider: "vapid",
          failureCode: statusCode ? String(statusCode) : "unknown",
          failureMessage: errStr.substring(0, 200),
          createdAt: now,
        }),
      );

      failureCount++;
    }
  }

  logger.info("Push delivery complete", { messageId, userId, successCount, failureCount });

  // If ALL deliveries failed, mark the message as failed
  if (successCount === 0 && failureCount > 0) {
    await withRetry(() =>
      db
        .update(systemMessages)
        .set({ status: "failed", updatedAt: now })
        .where(eq(systemMessages.id, messageId)),
    );
  }
}
