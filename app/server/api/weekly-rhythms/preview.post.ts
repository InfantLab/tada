/**
 * POST /api/weekly-rhythms/preview
 * Generate a preview for testing without waiting for the scheduler.
 * Does not send email. Uses same sanitization and fallback rules.
 */

import { z } from "zod";
import { renderCelebration } from "~/server/services/weekly-rhythms/celebration";
import { renderEncouragement } from "~/server/services/weekly-rhythms/encouragement";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:weekly-rhythms:preview");

const previewSchema = z.object({
  kind: z.enum(["celebration", "encouragement"]),
  tierOverride: z
    .enum(["stats_only", "private_ai", "cloud_factual", "cloud_creative"])
    .optional(),
  weekStartDate: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  const body = await readBody(event);
  const parsed = previewSchema.safeParse(body);

  if (!parsed.success) {
    throw createError(
      validationError(event, parsed.error.issues.map((i) => i.message)),
    );
  }

  const { kind, tierOverride, weekStartDate } = parsed.data;
  const timezone = user.timezone ?? "UTC";

  // Use last week as default reference
  const referenceDate = weekStartDate
    ? new Date(`${weekStartDate}T12:00:00Z`)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    if (kind === "celebration") {
      const result = await renderCelebration(
        user.id,
        tierOverride ?? "stats_only",
        referenceDate,
        timezone,
      );

      return {
        kind: "celebration",
        tierRequested: tierOverride ?? "stats_only",
        tierApplied: result.tierApplied,
        fallbackReason: result.fallbackReason,
        preview: {
          title: result.title,
          summaryBlocks: result.summaryBlocks,
          narrativeText: result.narrativeText,
        },
      };
    }

    // Encouragement
    const result = await renderEncouragement(
      user.id,
      referenceDate,
      timezone,
    );

    return {
      kind: "encouragement",
      tierRequested: "stats_only",
      tierApplied: "stats_only",
      fallbackReason: null,
      preview: {
        title: result.title,
        summaryBlocks: result.summaryBlocks,
        narrativeText: result.narrativeText,
      },
    };
  } catch (error) {
    logger.error("Preview generation failed", error as Error);
    throw createError(internalError(event, "Preview generation failed"));
  }
});
