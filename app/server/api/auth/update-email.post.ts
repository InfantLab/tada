/**
 * POST /api/auth/update-email
 *
 * Updates the current user's email address.
 * Automatically sends a verification email to the new address.
 *
 * Requires:
 * - Authenticated user
 * - Valid email address
 *
 * Request body:
 * - email: string (required) - New email address
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users, emailVerificationTokens } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import {
  generateSecureToken,
  hashToken,
  generateTokenExpiry,
  generateId,
} from "~/server/utils/tokens";
import { sendEmail, isEmailConfigured, getAppUrl } from "~/server/utils/email";
import { emailVerificationEmail } from "~/server/templates/email";
import { logAuthEvent } from "~/server/utils/authEvents";

const logger = createLogger("api:auth:update-email");

interface UpdateEmailBody {
  email: string;
}

export default defineEventHandler(async (event) => {
  // Require authentication
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const userId = event.context.user.id;

  try {
    const body = (await readBody(event)) as UpdateEmailBody;

    // Validate email
    const email = body.email?.trim()?.toLowerCase();
    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: "Email is required",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Please enter a valid email address",
      });
    }

    // Get current user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found",
      });
    }

    // Check if email is already in use by another user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser && existingUser.id !== userId) {
      throw createError({
        statusCode: 400,
        statusMessage: "This email is already in use",
      });
    }

    // If email hasn't changed, just return success
    if (user.email === email) {
      return {
        success: true,
        message: "Email unchanged",
        emailVerified: user.emailVerified ?? false,
      };
    }

    // Update email and mark as unverified
    const now = new Date().toISOString();
    await db
      .update(users)
      .set({
        email,
        emailVerified: false, // Reset verification when email changes
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    logger.info("Email updated", { userId, newEmail: email });

    // Log auth event
    await logAuthEvent({
      event,
      userId,
      eventType: "email_update",
      metadata: { oldEmail: user.email, newEmail: email },
    });

    // Generate and send verification token
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = generateTokenExpiry(24); // 24 hours

    // Store token in database
    await db.insert(emailVerificationTokens).values({
      id: generateId(),
      userId,
      tokenHash,
      expiresAt,
    });

    logger.info("Email verification token created", { userId });

    // Send verification email if configured
    if (isEmailConfigured()) {
      const emailContent = emailVerificationEmail(user.username, token);
      const sent = await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      if (!sent) {
        logger.error("Failed to send verification email", { email });
        // Don't fail the whole request if email sending fails
        return {
          success: true,
          message: "Email updated, but verification email failed to send",
          emailVerified: false,
        };
      }

      return {
        success: true,
        message: "Email updated. Verification email sent!",
        emailVerified: false,
      };
    } else {
      // In development without SMTP, log the verification link
      const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
      logger.info("Email verification link (SMTP not configured)", {
        email,
        verifyUrl,
      });

      return {
        success: true,
        message: "Email updated (verification email not sent - SMTP not configured)",
        emailVerified: false,
        ...(process.env["NODE_ENV"] !== "production"
          ? { _debug: { token, verifyUrl } }
          : {}),
      };
    }
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    logger.error("Error updating email", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId,
    });

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update email. Please try again.",
    });
  }
});
