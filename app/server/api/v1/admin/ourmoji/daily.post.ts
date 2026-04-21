/**
 * POST /api/v1/admin/ourmoji/daily
 *
 * Admin ingestion endpoint — posts a single day's Ourmoji payload on
 * behalf of a target user. Intended for trusted server-to-server agents
 * (e.g. the home-server oracle) authenticated with an admin API key.
 *
 * Auth: requires admin + `admin:users:write` permission (API keys).
 * Sessions held by an admin also work.
 *
 * Idempotent per (userId, date): a re-post for the same date updates
 * the existing entry rather than duplicating.
 */

import { defineEventHandler, readBody, createError } from "h3";

import { requireAdmin } from "~/server/utils/admin";
import {
  notFound,
  success,
  validationError,
} from "~/server/utils/response";
import { logAuthEvent } from "~/server/utils/authEvents";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { upsertDailyOurmoji } from "~/server/services/ourmoji/daily";
import { ourmojiApiLogger as logger } from "~/server/services/ourmoji/logger";
import { adminDailyOurmojiPayloadSchema } from "~/server/api/ourmoji/schemas";

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:users:write");

  const body = await readBody(event);
  const parsed = adminDailyOurmojiPayloadSchema.safeParse(body);

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "_root";
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    throw createError(validationError(event, errors));
  }

  const payload = parsed.data;

  const targetUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (targetUser.length === 0) {
    throw createError(notFound(event, "User"));
  }

  const enabled = await isOurmojiEnabledForUser(payload.userId);
  if (!enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: "Target user does not have the ourmoji module enabled",
    });
  }

  const dto = await upsertDailyOurmoji({
    userId: payload.userId,
    date: payload.date,
    emoji: payload.emoji,
    reflection: payload.reflection,
    moonPhase: payload.moonPhase,
    moonIllumination: payload.moonIllumination ?? null,
    wheelOfYear: payload.wheelOfYear ?? null,
    wheelCategory: payload.wheelCategory ?? null,
    timezone: payload.timezone,
    source: "api",
  });

  const auth = event.context.auth!;
  await logAuthEvent({
    event,
    userId: auth.userId,
    eventType: "admin:user_updated",
    metadata: {
      targetUserId: payload.userId,
      action: "ourmoji_daily_ingested",
      date: payload.date,
    },
  });

  logger.info("Admin ingested Ourmoji daily", {
    adminUserId: auth.userId,
    targetUserId: payload.userId,
    date: payload.date,
  });

  return success(event, { entry: dto });
});
