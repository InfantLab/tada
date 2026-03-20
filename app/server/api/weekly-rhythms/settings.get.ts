/**
 * GET /api/weekly-rhythms/settings
 * Returns the current user's weekly-rhythm settings with capability flags.
 */

import { getWeeklyRhythmSettings } from "~/server/services/weekly-rhythms/settings";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:weekly-rhythms:settings:get");

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user?.id) {
    throw createError(unauthorized(event));
  }

  try {
    const settings = await getWeeklyRhythmSettings(user.id);

    // Check capabilities
    const privateAiAvailable = false; // TODO: check local AI capability
    const cloudAiAvailable =
      !!process.env["GROQ_API_KEY"] ||
      !!process.env["OPENAI_API_KEY"] ||
      !!process.env["ANTHROPIC_API_KEY"];
    const pushAvailable = false; // Not yet implemented

    if (!settings) {
      // Return defaults for users who haven't onboarded
      return {
        celebrationEnabled: false,
        encouragementEnabled: false,
        celebrationTier: "stats_only",
        deliveryChannels: {
          celebration: { inApp: true, email: false, push: false },
          encouragement: { inApp: true, email: false, push: false },
        },
        schedule: {
          encouragementLocalTime: "15:03",
          celebrationGenerateLocalTime: "03:33",
          celebrationDeliverLocalTime: "08:08",
        },
        email: {
          address: user.email ?? null,
          configured: !!user.email,
          unsubscribed: false,
          consecutiveFailures: 0,
        },
        capabilities: {
          privateAiAvailable,
          cloudAiAvailable,
          pushAvailable,
        },
        privacy: {
          cloudAcknowledged: false,
        },
      };
    }

    return {
      celebrationEnabled: settings.celebrationEnabled,
      encouragementEnabled: settings.encouragementEnabled,
      celebrationTier: settings.celebrationTier,
      deliveryChannels: settings.deliveryChannels,
      schedule: settings.generationSchedule,
      email: {
        address: user.email ?? null,
        configured: !!user.email,
        unsubscribed: !!settings.emailUnsubscribedAt,
        consecutiveFailures: settings.consecutiveEmailFailures,
      },
      capabilities: {
        privateAiAvailable,
        cloudAiAvailable,
        pushAvailable,
      },
      privacy: {
        cloudAcknowledged: !!settings.cloudPrivacyAcknowledgedAt,
      },
    };
  } catch (error) {
    logger.error("Failed to fetch weekly rhythm settings", error as Error);
    throw createError(
      internalError(event, "Failed to fetch weekly rhythm settings"),
    );
  }
});
