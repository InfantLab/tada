/**
 * Celebration assembly service.
 *
 * Orchestrates snapshot generation, tiered rendering, and message persistence
 * for weekly celebrations.
 */

import { createLogger } from "~/server/utils/logger";
import { generateWeeklySnapshot } from "./snapshots";
import { renderTier1Stats } from "./renderer";
import { persistWeeklyMessage, getExistingMessage } from "./messages";
import { getWeekBoundaries, getNextScheduledUtc } from "./time";
import type { CelebrationTier } from "~/types/weekly-rhythms";
import type { WeeklyStatsSnapshot } from "~/server/db/schema";

const logger = createLogger("service:weekly-rhythms:celebration");

export interface CelebrationResult {
  messageId: string;
  title: string;
  summaryBlocks: Array<{
    section: string;
    heading: string;
    lines: string[];
  }>;
  narrativeText: string | null;
  tierRequested: string;
  tierApplied: string;
  fallbackReason: string | null;
}

/**
 * Generate a celebration for a user's completed week.
 * Returns existing message if one already exists (idempotent).
 */
export async function renderCelebration(
  userId: string,
  requestedTier: CelebrationTier,
  referenceDate: Date,
  timezone: string,
): Promise<CelebrationResult> {
  const boundaries = getWeekBoundaries(referenceDate, timezone);

  // Check for existing message (idempotency)
  const existing = await getExistingMessage(
    userId,
    "celebration",
    boundaries.weekStartDate,
  );
  if (existing) {
    logger.debug("Returning existing celebration", {
      userId,
      week: boundaries.weekStartDate,
    });
    return {
      messageId: existing.id,
      title: existing.title,
      summaryBlocks: existing.summaryBlocks,
      narrativeText: existing.narrativeText,
      tierRequested: existing.tierRequested,
      tierApplied: existing.tierApplied,
      fallbackReason: existing.fallbackReason,
    };
  }

  // Generate snapshot
  const snapshot = await generateWeeklySnapshot(
    userId,
    "celebration",
    referenceDate,
    timezone,
  );

  // Render based on tier
  const rendered = await renderByTier(snapshot, requestedTier, userId);

  // Compute delivery time (Monday 08:08 local)
  const deliveryUtc = getNextScheduledUtc(referenceDate, timezone, 0, "08:08");

  // Persist
  const message = await persistWeeklyMessage({
    userId,
    snapshotId: snapshot.id,
    kind: "celebration",
    weekStartDate: boundaries.weekStartDate,
    tierRequested: requestedTier,
    tierApplied: rendered.tierApplied,
    fallbackReason: rendered.fallbackReason,
    title: rendered.title,
    summaryBlocks: rendered.summaryBlocks,
    narrativeText: rendered.narrativeText,
    inAppVisibleFrom: deliveryUtc.toISOString(),
    scheduledDeliveryAt: deliveryUtc.toISOString(),
  });

  return {
    messageId: message.id,
    title: rendered.title,
    summaryBlocks: rendered.summaryBlocks,
    narrativeText: rendered.narrativeText,
    tierRequested: requestedTier,
    tierApplied: rendered.tierApplied,
    fallbackReason: rendered.fallbackReason,
  };
}

async function renderByTier(
  snapshot: WeeklyStatsSnapshot,
  requestedTier: CelebrationTier,
  userId: string,
): Promise<{
  title: string;
  summaryBlocks: Array<{ section: string; heading: string; lines: string[] }>;
  narrativeText: string | null;
  tierApplied: string;
  fallbackReason: string | null;
}> {
  // Tier 1: always succeeds
  if (requestedTier === "stats_only") {
    const content = renderTier1Stats(snapshot);
    return {
      ...content,
      tierApplied: "stats_only",
      fallbackReason: null,
    };
  }

  // Tier 2 (Private AI) — placeholder, falls back to Tier 1
  if (requestedTier === "private_ai") {
    try {
      const { renderTier2PrivateAi } = await import("./providers/privateAi");
      const content = await renderTier2PrivateAi(snapshot, userId);
      return {
        ...content,
        tierApplied: "private_ai",
        fallbackReason: null,
      };
    } catch {
      logger.info("Private AI unavailable, falling back to Tier 1", { userId });
      const content = renderTier1Stats(snapshot);
      return {
        ...content,
        tierApplied: "stats_only",
        fallbackReason: "private_ai_unavailable",
      };
    }
  }

  // Tier 3/4 (Cloud AI) — placeholder, falls back to Tier 1
  if (
    requestedTier === "cloud_factual" ||
    requestedTier === "cloud_creative"
  ) {
    try {
      const { renderCloudAi } = await import("./providers/cloudAi");
      const content = await renderCloudAi(
        snapshot,
        userId,
        requestedTier === "cloud_creative" ? "creative" : "factual",
      );
      return {
        ...content,
        tierApplied: requestedTier,
        fallbackReason: null,
      };
    } catch {
      logger.info("Cloud AI unavailable, falling back to Tier 1", {
        userId,
        requestedTier,
      });
      const content = renderTier1Stats(snapshot);
      return {
        ...content,
        tierApplied: "stats_only",
        fallbackReason: "cloud_provider_unavailable",
      };
    }
  }

  // Unknown tier — fall back to Tier 1
  const content = renderTier1Stats(snapshot);
  return {
    ...content,
    tierApplied: "stats_only",
    fallbackReason: "unknown_tier",
  };
}
