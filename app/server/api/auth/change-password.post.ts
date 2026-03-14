import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { users, sessions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";
import { hashPassword, verifyPassword } from "~/server/utils/password";
import { sendEmail, isEmailConfigured } from "~/server/utils/email";
import { passwordChangedEmail } from "~/server/templates/email";
import { logAuthEvent } from "~/server/utils/authEvents";
import { createSession, setSessionCookie } from "~/server/utils/auth";
import { unauthorized, apiError, internalError } from "~/server/utils/response";

const logger = createLogger("api:auth:change-password");

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export default defineEventHandler(async (event) => {
  try {
    // Check authentication
    const session = event.context.session;
    const user = event.context.user;

    if (!session || !user) {
      throw createError(unauthorized(event, "You must be logged in to change your password"));
    }

    const body = (await readBody(event)) as ChangePasswordBody;

    // Validate input
    if (!body.currentPassword || typeof body.currentPassword !== "string") {
      throw createError(
        apiError(event, "CURRENT_PASSWORD_REQUIRED", "Current password is required", 400)
      );
    }

    if (!body.newPassword || typeof body.newPassword !== "string") {
      throw createError(
        apiError(event, "NEW_PASSWORD_REQUIRED", "New password is required", 400)
      );
    }

    if (body.newPassword.length < 8) {
      throw createError(
        apiError(event, "PASSWORD_TOO_SHORT", "New password must be at least 8 characters", 400)
      );
    }

    if (body.currentPassword === body.newPassword) {
      throw createError(
        apiError(event, "PASSWORD_UNCHANGED", "New password must be different from current password", 400)
      );
    }

    // Get user from database to verify current password
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (existingUser.length === 0 || !existingUser[0]?.passwordHash) {
      throw createError(
        apiError(event, "PASSWORD_VERIFICATION_FAILED", "Unable to verify current password", 400)
      );
    }

    const dbUser = existingUser[0];

    // Verify current password
    const validPassword = await verifyPassword(
      body.currentPassword,
      dbUser.passwordHash!
    );

    if (!validPassword) {
      await logAuthEvent({
        event,
        userId: user.id,
        eventType: "password_change",
        metadata: { success: false, reason: "invalid_current_password" },
      });

      throw createError(
        apiError(event, "INVALID_CURRENT_PASSWORD", "Current password is incorrect", 400)
      );
    }

    // Hash the new password
    const passwordHash = await hashPassword(body.newPassword);

    // Update password
    const now = new Date().toISOString();
    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    logger.info("Password changed successfully", { userId: user.id });

    // Log the event
    await logAuthEvent({
      event,
      userId: user.id,
      eventType: "password_change",
      metadata: { success: true },
    });

    // Invalidate all other sessions (keep current session active)
    await db.delete(sessions).where(eq(sessions.userId, user.id));

    // Create a new session for the current user
    const newSession = await createSession(user.id);
    setSessionCookie(event, newSession.id);

    // Send notification email if configured
    if (isEmailConfigured() && dbUser.email) {
      const emailContent = passwordChangedEmail(dbUser.username);
      await sendEmail({
        to: dbUser.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    }

    return {
      success: true,
      message: "Password changed successfully",
    };
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    logger.error("Error changing password", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw createError(internalError(event, "An error occurred. Please try again."));
  }
});
