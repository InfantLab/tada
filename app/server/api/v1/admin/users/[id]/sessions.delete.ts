/**
 * DELETE /api/v1/admin/users/:id/sessions
 *
 * Invalidate all active sessions for a user.
 * Useful when an account may be compromised or after a password reset.
 */

import { requireAdmin } from "~/server/utils/admin";
import { success, notFound } from "~/server/utils/response";
import { logAuthEvent } from "~/server/utils/authEvents";
import { db } from "~/server/db";
import { users, sessions } from "~/server/db/schema";
import { eq, count } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:users:write");

  const userId = getRouterParam(event, "id");
  if (!userId) {
    throw createError(notFound(event, "User"));
  }

  // Verify user exists
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw createError(notFound(event, "User"));
  }

  // Count sessions before deletion
  const countResult = await db
    .select({ count: count() })
    .from(sessions)
    .where(eq(sessions.userId, userId));

  const sessionsRevoked = countResult[0]?.count ?? 0;

  // Delete all sessions
  await db.delete(sessions).where(eq(sessions.userId, userId));

  const auth = event.context.auth!;
  await logAuthEvent({
    event,
    userId: auth.userId,
    eventType: "admin:sessions_invalidated",
    metadata: {
      targetUserId: userId,
      sessionsRevoked,
    },
  });

  return success(event, {
    message: "All sessions invalidated",
    sessionsRevoked,
  });
});
