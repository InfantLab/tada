/**
 * PATCH /api/v1/admin/users/:id/modules
 *
 * Toggle per-user feature module flags (e.g. ourmoji).
 * Merges the supplied flags into the existing `enabled_modules` JSON field
 * on `user_preferences`, creating the row if it doesn't exist.
 *
 * Body: { "ourmoji": true, "someOtherFlag": false }
 */

import * as z from "zod";
import { nanoid } from "nanoid";
import { requireAdmin } from "~/server/utils/admin";
import { success, notFound, validationError } from "~/server/utils/response";
import { logAuthEvent } from "~/server/utils/authEvents";
import { db } from "~/server/db";
import { users, userPreferences } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";

const bodySchema = z.record(z.string(), z.boolean()).refine(
  (obj) => Object.keys(obj).length > 0,
  { message: "At least one module flag is required" },
);

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

  const body = await readBody(event);
  const parseResult = bodySchema.safeParse(body);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".") || "_root";
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    throw createError(validationError(event, errors));
  }

  const flags = parseResult.data;

  // Fetch existing preferences row
  const existing = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  let previousModules: Record<string, boolean> = {};
  let updatedModules: Record<string, boolean>;

  if (existing.length === 0) {
    // Create preferences row with the supplied flags
    updatedModules = { ...flags };
    await db.insert(userPreferences).values({
      id: nanoid(),
      userId,
      enabledModules: updatedModules,
    });
  } else {
    // Merge flags into existing enabled_modules
    const current = existing[0].enabledModules;
    previousModules =
      current && typeof current === "object" ? { ...current } : {};
    updatedModules = { ...previousModules, ...flags };

    await db
      .update(userPreferences)
      .set({
        enabledModules: updatedModules,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(userPreferences.userId, userId));
  }

  const auth = event.context.auth!;
  await logAuthEvent({
    event,
    userId: auth.userId,
    eventType: "admin:user_updated",
    metadata: {
      targetUserId: userId,
      action: "modules_updated",
      changes: flags,
      previousModules,
    },
  });

  return success(event, { enabledModules: updatedModules });
});
