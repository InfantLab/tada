import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { users, sessions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";
import { hashPassword, verifyPassword } from "~/server/utils/password";
import { sendEmail, isEmailConfigured } from "~/server/utils/email";
import { passwordChangedEmail } from "~/server/templates/email";
import { logAuthEvent } from "~/server/utils/authEvents";
import { lucia } from "~/server/utils/auth";

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
      throw createError({
        statusCode: 401,
        statusMessage: "You must be logged in to change your password",
      });
    }

    const body = (await readBody(event)) as ChangePasswordBody;

    // Validate input
    if (!body.currentPassword || typeof body.currentPassword !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Current password is required",
      });
    }

    if (!body.newPassword || typeof body.newPassword !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "New password is required",
      });
    }

    if (body.newPassword.length < 6) {
      throw createError({
        statusCode: 400,
        statusMessage: "New password must be at least 6 characters",
      });
    }

    if (body.currentPassword === body.newPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: "New password must be different from current password",
      });
    }

    // Get user from database to verify current password
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (existingUser.length === 0 || !existingUser[0]?.passwordHash) {
      throw createError({
        statusCode: 400,
        statusMessage: "Unable to verify current password",
      });
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

      throw createError({
        statusCode: 400,
        statusMessage: "Current password is incorrect",
      });
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
    const newSession = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(newSession.id);

    setCookie(
      event,
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

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

    throw createError({
      statusCode: 500,
      statusMessage: "An error occurred. Please try again.",
    });
  }
});
