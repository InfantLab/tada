/**
 * GET /api/weekly-rhythms/unsubscribe/:token
 * One-click email unsubscribe endpoint linked from weekly-rhythm emails.
 */

import { verifyUnsubscribeToken } from "~/server/utils/hmacTokens";
import { updateWeeklyRhythmSettings } from "~/server/services/weekly-rhythms/settings";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:weekly-rhythms:unsubscribe");

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token");
  if (!token) {
    throw createError({
      statusCode: 400,
      data: {
        error: "INVALID_UNSUBSCRIBE_TOKEN",
        message: "No token provided",
      },
    });
  }

  const secret = process.env["HMAC_SECRET"];
  if (!secret) {
    logger.error("HMAC_SECRET not configured");
    throw createError({
      statusCode: 500,
      data: { error: "SERVER_ERROR", message: "Server configuration error" },
    });
  }

  const verification = verifyUnsubscribeToken(token, secret);
  if (!verification.valid) {
    throw createError({
      statusCode: 400,
      data: {
        error: "INVALID_UNSUBSCRIBE_TOKEN",
        message:
          verification.error || "This unsubscribe link is invalid or has expired",
      },
    });
  }

  const userId = verification.payload!.userId;

  try {
    await updateWeeklyRhythmSettings(userId, {
      emailUnsubscribedAt: new Date().toISOString(),
      emailUnsubscribeSource: "email_link",
    });

    logger.info("User unsubscribed via email link", { userId });

    // Return simple HTML confirmation page
    setHeader(event, "Content-Type", "text/html; charset=utf-8");
    return `
<!DOCTYPE html>
<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; background-color: #FFFBF5;">
  <div style="background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #E7E5E4; text-align: center;">
    <div style="font-size: 20px; font-weight: 700; color: #E6A800; margin-bottom: 24px;">Ta-Da!</div>
    <h2 style="margin: 0 0 12px; color: #44403C;">Unsubscribed</h2>
    <p style="color: #78716C; font-size: 14px; line-height: 1.5;">
      You've been unsubscribed from weekly email summaries.<br>
      In-app celebrations will still appear.
    </p>
    <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 24px; background-color: #E6A800; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Return to Ta-Da!</a>
  </div>
</body>
</html>`;
  } catch (error) {
    logger.error("Unsubscribe failed", error as Error);
    throw createError({
      statusCode: 500,
      data: { error: "UNSUBSCRIBE_FAILED", message: "Failed to unsubscribe" },
    });
  }
});
