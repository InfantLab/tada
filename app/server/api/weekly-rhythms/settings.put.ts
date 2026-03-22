/**
 * PUT /api/weekly-rhythms/settings
 * Creates or updates weekly-rhythm settings with validation.
 */

import { z } from "zod";
import {
  upsertWeeklyRhythmSettings,
  getWeeklyRhythmSettings,
  refreshNextDueTimes,
} from "~/server/services/weekly-rhythms/settings";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:weekly-rhythms:settings:put");

const VALID_TIERS = [
  "stats_only",
  "private_ai",
  "cloud_factual",
  "cloud_creative",
] as const;

const channelSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  push: z.boolean(),
});

const settingsSchema = z.object({
  celebrationEnabled: z.boolean().optional(),
  encouragementEnabled: z.boolean().optional(),
  celebrationTier: z.enum(VALID_TIERS).optional(),
  deliveryChannels: z
    .object({
      celebration: channelSchema,
      encouragement: channelSchema,
    })
    .optional(),
  acknowledgeCloudPrivacy: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  const body = await readBody(event);
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    throw createError(
      validationError(event, parsed.error.issues.map((i) => i.message)),
    );
  }

  const data = parsed.data;

  try {
    // Validation: email delivery requires user email
    if (data.deliveryChannels) {
      const emailRequested =
        data.deliveryChannels.celebration.email ||
        data.deliveryChannels.encouragement.email;
      if (emailRequested && !user.email) {
        throw createError(
          apiError(
            event,
            "EMAIL_REQUIRED",
            "Add an email address before enabling email delivery",
            400,
          ),
        );
      }
    }

    // Validation: cloud tiers require privacy acknowledgement
    const isCloudTier =
      data.celebrationTier === "cloud_factual" ||
      data.celebrationTier === "cloud_creative";

    if (isCloudTier) {
      const existing = await getWeeklyRhythmSettings(user.id);
      const alreadyAcknowledged = !!existing?.cloudPrivacyAcknowledgedAt;

      if (!alreadyAcknowledged && !data.acknowledgeCloudPrivacy) {
        throw createError(
          apiError(
            event,
            "CLOUD_PRIVACY_ACK_REQUIRED",
            "Acknowledge the cloud privacy notice before enabling a cloud AI tier",
            400,
          ),
        );
      }
    }

    // Validation: private_ai when not available
    if (data.celebrationTier === "private_ai") {
      // TODO: actual capability check
      const privateAiAvailable = false;
      if (!privateAiAvailable) {
        throw createError({
          statusCode: 409,
          data: {
            error: "PRIVATE_AI_UNAVAILABLE",
            message: "Private AI is not available on this instance yet",
            available: false,
          },
        });
      }
    }

    const now = new Date().toISOString();
    const updates: Parameters<typeof upsertWeeklyRhythmSettings>[1] = {};

    if (data.celebrationEnabled !== undefined) {
      updates.celebrationEnabled = data.celebrationEnabled;
    }
    if (data.encouragementEnabled !== undefined) {
      updates.encouragementEnabled = data.encouragementEnabled;
    }
    if (data.celebrationTier !== undefined) {
      updates.celebrationTier = data.celebrationTier;
    }
    if (data.deliveryChannels !== undefined) {
      updates.deliveryChannels = data.deliveryChannels;
    }
    if (data.acknowledgeCloudPrivacy) {
      updates.cloudPrivacyAcknowledgedAt = now;
    }

    // Mark onboarding complete on first save
    const existing = await getWeeklyRhythmSettings(user.id);
    if (!existing?.onboardingCompletedAt) {
      updates.onboardingCompletedAt = now;
    }

    await upsertWeeklyRhythmSettings(user.id, updates);

    // Recompute next due times based on updated settings + user timezone
    await refreshNextDueTimes(user.id);

    const warnings: string[] = [];

    return {
      saved: true,
      settings: {
        celebrationEnabled:
          data.celebrationEnabled ?? existing?.celebrationEnabled ?? false,
        encouragementEnabled:
          data.encouragementEnabled ?? existing?.encouragementEnabled ?? false,
        celebrationTier:
          data.celebrationTier ?? existing?.celebrationTier ?? "stats_only",
      },
      warnings,
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error
    ) {
      throw error;
    }
    logger.error("Failed to update weekly rhythm settings", error as Error);
    throw createError(
      internalError(event, "Failed to update weekly rhythm settings"),
    );
  }
});
