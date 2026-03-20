/**
 * Weekly rhythms scheduler — sweeps for due generation and delivery work.
 *
 * The scheduler runs periodically (via the plugin) and:
 * 1. Finds users with enabled celebrations whose Monday generation time has passed
 * 2. Finds users with enabled encouragement whose Thursday time has passed
 * 3. Generates snapshots and messages for due users
 * 4. Queues email delivery for messages past their delivery time
 */

import { eq, and } from "drizzle-orm";
import { db } from "~/server/db";
import { withRetry } from "~/server/db/operations";
import { weeklyRhythmSettings, users } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import { getWeekBoundaries, getNextScheduledUtc } from "./time";
import { renderCelebration } from "./celebration";
import { getExistingMessage } from "./messages";

const logger = createLogger("service:weekly-rhythms:scheduler");

/**
 * Main scheduler sweep — called periodically by the plugin.
 * Processes all due generation and delivery work.
 */
export async function runSchedulerSweep(): Promise<void> {
  const now = new Date();
  logger.debug("Scheduler sweep starting", { now: now.toISOString() });

  try {
    await sweepCelebrationGeneration(now);
    await sweepEncouragementGeneration(now);
    await sweepEmailDelivery(now);
  } catch (err) {
    logger.error("Scheduler sweep error", err as Error);
  }

  logger.debug("Scheduler sweep complete");
}

/** Find users whose Monday generation time (03:33 local) has passed */
async function sweepCelebrationGeneration(now: Date): Promise<void> {
  // Find all users with celebrations enabled
  const enabledSettings = await withRetry(() =>
    db
      .select({
        settings: weeklyRhythmSettings,
        timezone: users.timezone,
      })
      .from(weeklyRhythmSettings)
      .innerJoin(users, eq(users.id, weeklyRhythmSettings.userId))
      .where(eq(weeklyRhythmSettings.celebrationEnabled, true)),
  );

  if (enabledSettings.length === 0) return;

  let generated = 0;
  for (const { settings, timezone } of enabledSettings) {
    try {
      const schedule = settings.generationSchedule;
      const genTime = schedule.celebrationGenerateLocalTime ?? "03:33";

      // For celebrations, we generate for the PREVIOUS week
      // Get Monday 03:33 of the current week
      const currentWeekGenUtc = getNextScheduledUtc(now, timezone, 0, genTime);

      // If we haven't passed this week's generation time, skip
      if (now < currentWeekGenUtc) continue;

      // The celebration covers the previous week
      const previousWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prevBoundaries = getWeekBoundaries(previousWeekDate, timezone);

      // Check if we already have a message for last week
      const existing = await getExistingMessage(
        settings.userId,
        "celebration",
        prevBoundaries.weekStartDate,
      );
      if (existing) continue;

      // Generate
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

/** Find users whose Thursday encouragement time (15:03 local) has passed */
async function sweepEncouragementGeneration(now: Date): Promise<void> {
  const enabledSettings = await withRetry(() =>
    db
      .select({
        settings: weeklyRhythmSettings,
        timezone: users.timezone,
      })
      .from(weeklyRhythmSettings)
      .innerJoin(users, eq(users.id, weeklyRhythmSettings.userId))
      .where(eq(weeklyRhythmSettings.encouragementEnabled, true)),
  );

  if (enabledSettings.length === 0) return;

  let generated = 0;
  for (const { settings, timezone } of enabledSettings) {
    try {
      const schedule = settings.generationSchedule;
      const encTime = schedule.encouragementLocalTime ?? "15:03";

      // Thursday = day offset 3
      const thursdayUtc = getNextScheduledUtc(now, timezone, 3, encTime);

      // If we haven't passed Thursday's time, skip
      if (now < thursdayUtc) continue;

      // Check for this week's Monday
      const boundaries = getWeekBoundaries(now, timezone);
      const existing = await getExistingMessage(
        settings.userId,
        "encouragement",
        boundaries.weekStartDate,
      );
      if (existing) continue;

      // Generate
      const { renderEncouragement } = await import("./encouragement");
      await renderEncouragement(settings.userId, now, timezone);
      generated++;
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
async function sweepEmailDelivery(now: Date): Promise<void> {
  const { lte } = await import("drizzle-orm");
  const { weeklyMessages: wm } = await import("~/server/db/schema");

  // Find messages that are generated/queued and past their delivery time
  const dueMessages = await withRetry(() =>
    db
      .select()
      .from(wm)
      .where(
        and(
          eq(wm.status, "generated"),
          lte(wm.scheduledDeliveryAt, now.toISOString()),
        ),
      ),
  );

  if (dueMessages.length === 0) return;

  let delivered = 0;
  for (const message of dueMessages) {
    try {
      // Check if user has email delivery enabled
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
        // Mark as delivered (in-app only)
        await withRetry(() =>
          db
            .update(wm)
            .set({
              status: "delivered",
              deliveredAt: now.toISOString(),
              updatedAt: now.toISOString(),
            })
            .where(eq(wm.id, message.id)),
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
