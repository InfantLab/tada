/**
 * POST /api/v1/admin/users/:id/reset-password
 *
 * Trigger a password reset email for a user.
 * Does not set the password directly — sends the standard reset flow email.
 */

import { requireAdmin } from "~/server/utils/admin";
import { success, notFound } from "~/server/utils/response";
import { logAuthEvent } from "~/server/utils/authEvents";
import { db } from "~/server/db";
import { users, passwordResetTokens } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import {
  generateSecureToken,
  hashToken,
  generateTokenExpiry,
  generateId,
} from "~/server/utils/tokens";
import { sendEmail, isEmailConfigured, getAppUrl } from "~/server/utils/email";
import { passwordResetEmail } from "~/server/templates/email";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:admin:reset-password");

export default defineEventHandler(async (event) => {
  requireAdmin(event, "admin:users:write");

  const userId = getRouterParam(event, "id");
  if (!userId) {
    throw createError(notFound(event, "User"));
  }

  // Fetch user
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw createError(notFound(event, "User"));
  }

  const targetUser = user[0]!;

  if (!targetUser.email) {
    throw createError({
      statusCode: 400,
      message: "User has no email address",
    });
  }

  // Generate reset token (reuses existing logic from forgot-password)
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const expiresAt = generateTokenExpiry(6); // 6 hours

  await db.insert(passwordResetTokens).values({
    id: generateId(),
    userId: targetUser.id,
    tokenHash,
    expiresAt,
  });

  // Send email
  if (isEmailConfigured()) {
    const emailContent = passwordResetEmail(targetUser.username, token);
    const sent = await sendEmail({
      to: targetUser.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (!sent) {
      logger.error("Failed to send admin-triggered password reset email", {
        userId: targetUser.id,
      });
      throw createError({
        statusCode: 500,
        message: "Failed to send password reset email",
      });
    }
  } else {
    const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    logger.info("Password reset link (SMTP not configured)", {
      email: targetUser.email,
      resetUrl,
    });
  }

  const auth = event.context.auth!;
  await logAuthEvent({
    event,
    userId: auth.userId,
    eventType: "admin:password_reset_triggered",
    metadata: {
      targetUserId: targetUser.id,
      targetEmail: targetUser.email,
    },
  });

  return success(event, {
    message: "Password reset email sent",
    email: targetUser.email,
    expiresAt,
  });
});
