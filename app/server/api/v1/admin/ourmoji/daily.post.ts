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

defineRouteMeta({
  openAPI: {
    tags: ["Ourmoji", "Admin"],
    summary: "Ingest a daily Ourmoji on behalf of a user (admin)",
    description:
      "Posts a single day's Ourmoji payload for a target user. Intended " +
      "for trusted server-to-server agents authenticated with an admin " +
      "API key. Idempotent per (userId, date).",
    security: [{ bearerAuth: ["admin:users:write"] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: [
              "userId",
              "date",
              "emoji",
              "reflection",
              "moonPhase",
              "timezone",
            ],
            properties: {
              userId: { type: "string" },
              date: { type: "string", format: "date" },
              emoji: { type: "string", minLength: 1, maxLength: 16 },
              reflection: { type: "string", minLength: 1, maxLength: 5000 },
              moonPhase: { type: "string" },
              moonIllumination: {
                type: "number",
                minimum: 0,
                maximum: 100,
                nullable: true,
              },
              wheelOfYear: { type: "string", nullable: true },
              wheelCategory: { type: "string", nullable: true },
              timezone: { type: "string" },
            },
          },
        },
      },
    },
    responses: {
      "200": { description: "Ourmoji entry upserted" },
      "400": {
        description:
          "Validation error or target user does not have ourmoji enabled",
      },
      "401": { description: "Missing or invalid Bearer token" },
      "403": { description: "Caller is not an admin" },
      "404": { description: "Target user not found" },
    },
  },
});

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
