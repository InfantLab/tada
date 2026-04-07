/**
 * GET /api/ourmoji/calendar
 *
 * Returns Ourmoji entries for the authenticated user within an optional
 * date range. Hidden behind the `enabled_modules.ourmoji` feature flag.
 */

import { defineEventHandler, getQuery, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { listDailyEntries } from "~/server/services/ourmoji/daily";
import { parseOrThrow } from "~/server/services/ourmoji/validation";
import { calendarQuerySchema } from "./schemas";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError(unauthorized(event));
  }

  const enabled = await isOurmojiEnabledForUser(user.id);
  if (!enabled) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const query = parseOrThrow(
    calendarQuerySchema,
    getQuery(event),
    "calendar query",
  );

  const entries = await listDailyEntries(user.id, {
    from: query.from,
    to: query.to,
  });

  return { entries };
});
