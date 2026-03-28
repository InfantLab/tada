/**
 * DELETE /api/push/subscribe
 * Soft-unsubscribe a push endpoint for the current user.
 *
 * Body: { endpoint: string }
 * Returns: { unsubscribed: true }
 */

import { and, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { pushSubscriptions } from "~/server/db/schema";
import { withRetry } from "~/server/db/operations";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  const body = await readBody<{ endpoint: string }>(event);

  if (!body?.endpoint) {
    throw createError(
      apiError(event, "INVALID_BODY", "endpoint is required", 400),
    );
  }

  const now = new Date().toISOString();

  await withRetry(() =>
    db
      .update(pushSubscriptions)
      .set({ disabledAt: now })
      .where(
        and(
          eq(pushSubscriptions.endpoint, body.endpoint),
          eq(pushSubscriptions.userId, user.id),
        ),
      ),
  );

  return success(event, { unsubscribed: true });
});
