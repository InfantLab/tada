import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { users, passwordResetTokens, sessions } from "~/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";
import { hashToken, isTokenExpired } from "~/server/utils/tokens";
import { hashPassword } from "~/server/utils/password";
import { sendEmail, isEmailConfigured } from "~/server/utils/email";
import { passwordChangedEmail } from "~/server/templates/email";
import { logAuthEvent } from "~/server/utils/authEvents";

const logger = createLogger("api:auth:reset-password");

interface ResetPasswordBody {
  token: string;
  password: string;
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as ResetPasswordBody;

    // Validate input
    if (!body.token || typeof body.token !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Reset token is required",
      });
    }

    if (!body.password || typeof body.password !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "New password is required",
      });
    }

    if (body.password.length < 6) {
      throw createError({
        statusCode: 400,
        statusMessage: "Password must be at least 6 characters",
      });
    }

    // Hash the token to compare with stored hash
    const tokenHash = hashToken(body.token);

    // Find the token in database
    const tokenRecords = await db
      .select({
        token: passwordResetTokens,
        user: users,
      })
      .from(passwordResetTokens)
      .innerJoin(users, eq(passwordResetTokens.userId, users.id))
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt)
        )
      )
      .limit(1);

    if (tokenRecords.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Invalid or expired reset link. Please request a new one.",
      });
    }

    const { token: tokenRecord, user } = tokenRecords[0]!;

    // Check expiry
    if (isTokenExpired(tokenRecord.expiresAt)) {
      throw createError({
        statusCode: 400,
        statusMessage: "This reset link has expired. Please request a new one.",
      });
    }

    // Hash the new password
    const passwordHash = await hashPassword(body.password);

    // Update user password and mark token as used in a transaction
    const now = new Date().toISOString();

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    await db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, tokenRecord.id));

    // Invalidate all existing sessions for security
    await db.delete(sessions).where(eq(sessions.userId, user.id));

    logger.info("Password reset completed", { userId: user.id });

    // Log the event
    await logAuthEvent({
      event,
      userId: user.id,
      eventType: "password_reset_complete",
    });

    // Send notification email if configured
    if (isEmailConfigured() && user.email) {
      const emailContent = passwordChangedEmail(user.username);
      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    }

    return {
      success: true,
      message:
        "Password has been reset successfully. Please log in with your new password.",
    };
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    logger.error("Error resetting password", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw createError({
      statusCode: 500,
      statusMessage: "An error occurred. Please try again.",
    });
  }
});
