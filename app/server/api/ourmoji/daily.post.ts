/**
 * POST /api/ourmoji/daily
 *
 * Ingests a single day's Ourmoji payload (emoji, reflection, moon, wheel)
 * for the authenticated user. Idempotent per (userId, date): a re-post
 * for the same date updates the existing entry rather than duplicating.
 *
 * Auth: required. Feature flag: caller must have `enabled_modules.ourmoji`.
 */

import { defineEventHandler, readBody, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { upsertDailyOurmoji } from "~/server/services/ourmoji/daily";
import { parseOrThrow } from "~/server/services/ourmoji/validation";
import { ourmojiApiLogger as logger } from "~/server/services/ourmoji/logger";
import { dailyOurmojiPayloadSchema } from "./schemas";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError(unauthorized(event));
  }

  const enabled = await isOurmojiEnabledForUser(user.id);
  if (!enabled) {
    // Same shape as not-found to avoid leaking module existence to disabled users.
    throw createError({
      statusCode: 404,
      statusMessage: "Not found",
    });
  }

  const body = await readBody(event);
  const payload = parseOrThrow(
    dailyOurmojiPayloadSchema,
    body,
    "daily Ourmoji payload",
  );

  const dto = await upsertDailyOurmoji({
    userId: user.id,
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

  logger.info("Ourmoji daily ingested", {
    userId: user.id,
    date: payload.date,
  });
  return { entry: dto };
});
