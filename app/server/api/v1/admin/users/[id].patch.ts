/**
 * PATCH /api/v1/admin/users/:id
 *
 * Update user account properties for support purposes.
 */

import * as z from "zod";
import { requireAdmin } from "~/server/utils/admin";
import { success, notFound, validationError } from "~/server/utils/response";
import { logAuthEvent } from "~/server/utils/authEvents";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";

const bodySchema = z
  .object({
    subscriptionTier: z.enum(["free", "premium"]).optional(),
    subscriptionStatus: z
      .enum(["active", "cancelled", "expired", "past_due", "suspended"])
      .optional(),
    subscriptionExpiresAt: z.string().datetime().nullable().optional(),
    emailVerified: z.boolean().optional(),
  })
  .strict();

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:users:write");

  const userId = getRouterParam(event, "id");
  if (!userId) {
    throw createError(notFound(event, "User"));
  }

  const body = await readBody(event);
  const parseResult = bodySchema.safeParse(body);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    throw createError(validationError(event, errors));
  }

  const updates = parseResult.data;

  if (Object.keys(updates).length === 0) {
    throw createError(apiError(event, "NO_FIELDS", "No fields to update"));
  }

  // Fetch current user for audit trail
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing.length === 0) {
    throw createError(notFound(event, "User"));
  }

  const previousValues: Record<string, unknown> = {};
  for (const key of Object.keys(updates) as (keyof typeof updates)[]) {
    previousValues[key] = existing[0][key];
  }

  // Apply updates
  await db
    .update(users)
    .set({
      ...updates,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(users.id, userId));

  // Fetch updated user
  const updated = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      emailVerified: users.emailVerified,
      timezone: users.timezone,
      subscriptionTier: users.subscriptionTier,
      subscriptionStatus: users.subscriptionStatus,
      stripeCustomerId: users.stripeCustomerId,
      subscriptionExpiresAt: users.subscriptionExpiresAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const auth = event.context.auth!;
  await logAuthEvent({
    event,
    userId: auth.userId,
    eventType: "admin:user_updated",
    metadata: {
      targetUserId: userId,
      changes: updates,
      previousValues,
    },
  });

  return success(event, updated[0]);
});
