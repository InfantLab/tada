/**
 * DELETE /api/push/fcm-token
 * Unregister an FCM device token. Called when user disables push in settings.
 *
 * Body: { token: string }
 * Returns: { unregistered: true }
 */

import { and, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { fcmTokens } from "~/server/db/schema";
import { withRetry } from "~/server/db/operations";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:push:fcm-token");

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  const body = await readBody<{ token?: string }>(event);
  if (!body?.token || typeof body.token !== "string") {
    throw createError(apiError(event, "INVALID_BODY", "token is required", 400));
  }

  await withRetry(() =>
    db
      .delete(fcmTokens)
      .where(and(eq(fcmTokens.token, body.token!), eq(fcmTokens.userId, user.id))),
  );

  logger.debug("FCM token unregistered", { userId: user.id });
  return { unregistered: true };
});
