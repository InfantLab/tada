/**
 * GET /api/ourmoji/calendar
 *
 * Phase 1 stub. Implementation arrives in Phase 3 (T023).
 */

import { defineEventHandler, getQuery, createError } from "h3";
import { calendarQuerySchema } from "./schemas";
import { ourmojiApiLogger } from "~/server/services/ourmoji/logger";

export default defineEventHandler(async (event) => {
  const parsed = calendarQuerySchema.safeParse(getQuery(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid calendar query",
      data: parsed.error.flatten(),
    });
  }
  ourmojiApiLogger.debug("calendar.get stub invoked", parsed.data);
  throw createError({
    statusCode: 501,
    statusMessage: "Ourmoji calendar not yet implemented (T023)",
  });
});
