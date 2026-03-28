/**
 * POST /api/push/subscribe
 * Register (or refresh) a push subscription for the current user.
 *
 * Body: { endpoint: string, keys: { p256dh: string, auth: string }, userAgent?: string }
 * Returns: { subscribed: true }
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { pushSubscriptions } from "~/server/db/schema";
import { withRetry } from "~/server/db/operations";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  const body = await readBody<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  }>(event);

  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    throw createError(
      apiError(event, "INVALID_BODY", "endpoint and keys (p256dh, auth) are required", 400),
    );
  }

  const now = new Date().toISOString();

  // Check if endpoint already exists for a different user
  const existing = await withRetry(() =>
    db.query.pushSubscriptions.findFirst({
      where: eq(pushSubscriptions.endpoint, body.endpoint),
    }),
  );

  if (existing && existing.userId !== user.id) {
    throw createError(
      apiError(event, "ENDPOINT_CONFLICT", "This push endpoint is already registered", 409),
    );
  }

  if (existing && existing.userId === user.id) {
    // Refresh last used
    await withRetry(() =>
      db
        .update(pushSubscriptions)
        .set({
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          lastUsedAt: now,
          disabledAt: null,
          failureCount: 0,
        })
        .where(eq(pushSubscriptions.endpoint, body.endpoint)),
    );
  } else {
    // Insert new subscription
    await withRetry(() =>
      db.insert(pushSubscriptions).values({
        id: crypto.randomUUID(),
        userId: user.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent ?? null,
        createdAt: now,
        lastUsedAt: now,
        failureCount: 0,
      }),
    );
  }

  return success(event, { subscribed: true });
});
