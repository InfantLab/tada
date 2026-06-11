/**
 * POST /api/push/fcm-token
 * Register (or refresh) a native FCM device token for the current user.
 *
 * Body: { token: string }
 * Returns: { registered: true }
 */

import { eq } from "drizzle-orm";
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

  const { token } = body;
  const now = new Date().toISOString();

  // Upsert: if token already exists (from any user), re-assign to this user.
  // This handles device hand-offs and re-installations.
  const existing = await withRetry(() =>
    db.query.fcmTokens.findFirst({ where: eq(fcmTokens.token, token) }),
  );

  if (existing) {
    await withRetry(() =>
      db
        .update(fcmTokens)
        .set({ userId: user.id, lastUsedAt: now, disabledAt: null, failureCount: 0 })
        .where(eq(fcmTokens.token, token)),
    );
  } else {
    await withRetry(() =>
      db.insert(fcmTokens).values({
        id: crypto.randomUUID(),
        userId: user.id,
        token,
        createdAt: now,
      }),
    );
  }

  logger.debug("FCM token registered", { userId: user.id });
  return { registered: true };
});
