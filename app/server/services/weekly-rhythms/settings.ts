/**
 * Weekly rhythm settings domain service.
 * Manages opt-in state, tier choices, and delivery channel preferences.
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { withRetry } from "~/server/db/operations";
import { weeklyRhythmSettings } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import type {
  CelebrationTier,
  DeliveryChannelPreferences,
  GenerationSchedule,
} from "~/types/weekly-rhythms";

const logger = createLogger("service:weekly-rhythms:settings");

/** Default delivery channels — all off */
export const DEFAULT_DELIVERY_CHANNELS: DeliveryChannelPreferences = {
  celebration: { inApp: true, email: false, push: false },
  encouragement: { inApp: true, email: false, push: false },
};

/** Default generation schedule times */
export const DEFAULT_GENERATION_SCHEDULE: GenerationSchedule = {
  encouragementLocalTime: "15:03",
  celebrationGenerateLocalTime: "03:33",
  celebrationDeliverLocalTime: "08:08",
};

export async function getWeeklyRhythmSettings(userId: string) {
  return withRetry(() =>
    db.query.weeklyRhythmSettings.findFirst({
      where: eq(weeklyRhythmSettings.userId, userId),
    }),
  );
}

export async function upsertWeeklyRhythmSettings(
  userId: string,
  updates: {
    celebrationEnabled?: boolean;
    encouragementEnabled?: boolean;
    celebrationTier?: CelebrationTier;
    deliveryChannels?: DeliveryChannelPreferences;
    onboardingCompletedAt?: string;
    cloudPrivacyAcknowledgedAt?: string;
    privateAiUnavailableDismissedAt?: string;
    emailUnsubscribedAt?: string | null;
    emailUnsubscribeSource?: string | null;
    consecutiveEmailFailures?: number;
    lastEmailFailureAt?: string | null;
  },
) {
  const now = new Date().toISOString();
  const existing = await getWeeklyRhythmSettings(userId);

  if (existing) {
    logger.debug("Updating weekly rhythm settings", { userId });
    return withRetry(() =>
      db
        .update(weeklyRhythmSettings)
        .set({ ...updates, updatedAt: now })
        .where(eq(weeklyRhythmSettings.userId, userId))
        .returning(),
    );
  }

  logger.info("Creating weekly rhythm settings", { userId });
  const id = crypto.randomUUID();
  return withRetry(() =>
    db
      .insert(weeklyRhythmSettings)
      .values({
        id,
        userId,
        celebrationEnabled: updates.celebrationEnabled ?? false,
        encouragementEnabled: updates.encouragementEnabled ?? false,
        celebrationTier: updates.celebrationTier ?? "stats_only",
        deliveryChannels:
          updates.deliveryChannels ?? DEFAULT_DELIVERY_CHANNELS,
        generationSchedule: DEFAULT_GENERATION_SCHEDULE,
        onboardingCompletedAt: updates.onboardingCompletedAt ?? null,
        cloudPrivacyAcknowledgedAt: updates.cloudPrivacyAcknowledgedAt ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning(),
  );
}

export async function updateWeeklyRhythmSettings(
  userId: string,
  updates: Partial<typeof weeklyRhythmSettings.$inferInsert>,
) {
  const now = new Date().toISOString();
  return withRetry(() =>
    db
      .update(weeklyRhythmSettings)
      .set({ ...updates, updatedAt: now })
      .where(eq(weeklyRhythmSettings.userId, userId)),
  );
}
