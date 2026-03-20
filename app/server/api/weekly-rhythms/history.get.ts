/**
 * GET /api/weekly-rhythms/history
 * Returns recent generated weekly messages for the current user.
 */

import { getMessageHistory } from "~/server/services/weekly-rhythms/messages";
import { createLogger } from "~/server/utils/logger";
import type { WeeklyMessageKind } from "~/types/weekly-rhythms";

const logger = createLogger("api:weekly-rhythms:history:get");

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  const query = getQuery(event);
  const kind = query["kind"] as WeeklyMessageKind | undefined;
  const limit = Math.min(
    Math.max(Number(query["limit"]) || 8, 1),
    26,
  );

  // Validate kind
  if (kind && kind !== "celebration" && kind !== "encouragement") {
    throw createError(
      apiError(event, "INVALID_KIND", "kind must be celebration or encouragement", 400),
    );
  }

  try {
    const messages = await getMessageHistory(user.id, { kind, limit });

    return {
      messages: messages.map((m) => ({
        id: m.id,
        kind: m.kind,
        weekStartDate: m.weekStartDate,
        tierApplied: m.tierApplied,
        status: m.status,
        title: m.title,
        createdAt: m.createdAt,
      })),
    };
  } catch (error) {
    logger.error("Failed to fetch message history", error as Error);
    throw createError(internalError(event, "Failed to fetch message history"));
  }
});
