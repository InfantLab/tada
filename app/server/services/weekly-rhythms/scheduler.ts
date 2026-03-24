/**
 * Weekly rhythms scheduler — sweeps for due generation and delivery work.
 *
 * Uses pre-computed `next_celebration_due_utc` and `next_encouragement_due_utc`
 * columns for efficient queries. After each generation, refreshes the due time
 * to the next week's scheduled time.
 */

import { eq, and, lte } from "drizzle-orm";
import { db } from "~/server/db";
import { withRetry } from "~/server/db/operations";
import { weeklyRhythmSettings, systemMessages, users } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import { getWeekBoundaries } from "./time";
import { renderCelebration } from "./celebration";
import { getExistingMessage } from "./messages";
import { refreshNextDueTimes } from "./settings";

const logger = createLogger("service:weekly-rhythms:scheduler");

/**
 * Main scheduler sweep — called periodically by the plugin.
 * Queries pre-computed UTC due times instead of recalculating per user.
 */
export async function runSchedulerSweep(): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    await sweepCelebrationGeneration(now, nowIso);
    await sweepEncouragementGeneration(now, nowIso);
    await sweepEmailDelivery(now, nowIso);
  } catch (err) {
    logger.error("Scheduler sweep error", err as Error);
  }
}

/** Find users whose pre-computed celebration due time has passed */
async function sweepCelebrationGeneration(now: Date, nowIso: string): Promise<void> {
  const dueSettings = await withRetry(() =>
    db
      .select({
        settings: weeklyRhythmSettings,
        timezone: users.timezone,
      })
      .from(weeklyRhythmSettings)
      .innerJoin(users, eq(users.id, weeklyRhythmSettings.userId))
      .where(
        and(
          eq(weeklyRhythmSettings.celebrationEnabled, true),
          lte(weeklyRhythmSettings.nextCelebrationDueUtc, nowIso),
        ),
      ),
  );

  if (dueSettings.length === 0) return;

  let generated = 0;
  for (const { settings, timezone } of dueSettings) {
    try {
      // The celebration covers the previous week
      const previousWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prevBoundaries = getWeekBoundaries(previousWeekDate, timezone);

      // Check if we already have a message for last week (idempotency)
      const existing = await getExistingMessage(
        settings.userId,
        "celebration",
        prevBoundaries.weekStartDate,
      );
      if (existing) {
        // Already generated — just refresh the due time to next week
        await refreshNextDueTimes(settings.userId);
        continue;
      }

      const tier = settings.celebrationTier as
        | "stats_only"
        | "private_ai"
        | "cloud_factual"
        | "cloud_creative";
      await renderCelebration(
        settings.userId,
        tier,
        previousWeekDate,
        timezone,
      );
      generated++;

      // Advance due time to next week
      await refreshNextDueTimes(settings.userId);
    } catch (err) {
      logger.error("Celebration generation failed for user", err as Error, {
        userId: settings.userId,
      });
    }
  }

  if (generated > 0) {
    logger.info(`Generated ${generated} celebration(s)`);
  }
}

/** Find users whose pre-computed encouragement due time has passed */
async function sweepEncouragementGeneration(now: Date, nowIso: string): Promise<void> {
  const dueSettings = await withRetry(() =>
    db
      .select({
        settings: weeklyRhythmSettings,
        timezone: users.timezone,
      })
      .from(weeklyRhythmSettings)
      .innerJoin(users, eq(users.id, weeklyRhythmSettings.userId))
      .where(
        and(
          eq(weeklyRhythmSettings.encouragementEnabled, true),
          lte(weeklyRhythmSettings.nextEncouragementDueUtc, nowIso),
        ),
      ),
  );

  if (dueSettings.length === 0) return;

  let generated = 0;
  for (const { settings, timezone } of dueSettings) {
    try {
      const boundaries = getWeekBoundaries(now, timezone);
      const existing = await getExistingMessage(
        settings.userId,
        "encouragement",
        boundaries.weekStartDate,
      );
      if (existing) {
        // Already generated — just refresh the due time to next week
        await refreshNextDueTimes(settings.userId);
        continue;
      }

      const { renderEncouragement } = await import("./encouragement");
      await renderEncouragement(settings.userId, now, timezone);
      generated++;

      // Advance due time to next week
      await refreshNextDueTimes(settings.userId);
    } catch (err) {
      logger.error("Encouragement generation failed for user", err as Error, {
        userId: settings.userId,
      });
    }
  }

  if (generated > 0) {
    logger.info(`Generated ${generated} encouragement(s)`);
  }
}

/** Find queued messages whose scheduled delivery time has passed */
async function sweepEmailDelivery(now: Date, nowIso: string): Promise<void> {
  const dueMessages = await withRetry(() =>
    db
      .select()
      .from(systemMessages)
      .where(
        and(
          eq(systemMessages.status, "generated"),
          lte(systemMessages.scheduledDeliveryAt, nowIso),
        ),
      ),
  );

  if (dueMessages.length === 0) return;

  let delivered = 0;
  for (const message of dueMessages) {
    try {
      const settings = await withRetry(() =>
        db.query.weeklyRhythmSettings.findFirst({
          where: eq(weeklyRhythmSettings.userId, message.userId),
        }),
      );

      const channels = settings?.deliveryChannels;
      const emailEnabled =
        message.kind === "celebration"
          ? channels?.celebration?.email
          : channels?.encouragement?.email;

      if (emailEnabled && !settings?.emailUnsubscribedAt) {
        const { deliverEmailForMessage } = await import("./delivery");
        await deliverEmailForMessage(message.id, message.userId);
        delivered++;
      } else {
        await withRetry(() =>
          db
            .update(systemMessages)
            .set({
              status: "delivered",
              deliveredAt: nowIso,
              updatedAt: nowIso,
            })
            .where(eq(systemMessages.id, message.id)),
        );
      }
    } catch (err) {
      logger.error("Email delivery failed for message", err as Error, {
        messageId: message.id,
      });
    }
  }

  if (delivered > 0) {
    logger.info(`Delivered ${delivered} email(s)`);
  }
}
