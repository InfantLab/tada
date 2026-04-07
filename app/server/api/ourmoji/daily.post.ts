/**
 * POST /api/ourmoji/daily
 *
 * Phase 1 stub. Implementation arrives in Phase 3 (T022).
 * Validates payload shape against the contract schema and returns 501.
 */

import { defineEventHandler, readBody, createError } from "h3";
import { dailyOurmojiPayloadSchema } from "./schemas";
import { ourmojiApiLogger } from "~/server/services/ourmoji/logger";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = dailyOurmojiPayloadSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid daily Ourmoji payload",
      data: parsed.error.flatten(),
    });
  }
  ourmojiApiLogger.debug("daily.post stub invoked", { date: parsed.data.date });
  throw createError({
    statusCode: 501,
    statusMessage: "Ourmoji daily ingestion not yet implemented (T022)",
  });
});
