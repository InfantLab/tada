import { defineEventHandler, readBody, createError } from "h3";
import { db } from "~/server/db";
import { users, passwordResetTokens } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";
import {
  generateSecureToken,
  hashToken,
  generateTokenExpiry,
  generateId,
} from "~/server/utils/tokens";
import { sendEmail, isEmailConfigured, getAppUrl } from "~/server/utils/email";
import { passwordResetEmail } from "~/server/templates/email";
import { logAuthEvent, isRateLimited } from "~/server/utils/authEvents";

const logger = createLogger("api:auth:forgot-password");

interface ForgotPasswordBody {
  email: string;
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as ForgotPasswordBody;

    // Validate input
    if (!body.email || typeof body.email !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Email is required",
      });
    }

    const email = body.email.toLowerCase().trim();

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid email format",
      });
    }

    // Rate limiting - prevent abuse
    if (await isRateLimited(email, 1)) {
      // Still return success to prevent email enumeration
      logger.warn("Rate limited password reset request", { email });
      return {
        success: true,
        message:
          "If an account exists with this email, a password reset link will be sent.",
      };
    }

    // Find user by email
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always log the attempt (even if user not found - for security monitoring)
    await logAuthEvent({
      event,
      userId: existingUser[0]?.id || null,
      eventType: "password_reset_request",
      metadata: { email, userFound: existingUser.length > 0 },
    });

    // If user not found, still return success (prevent email enumeration)
    if (existingUser.length === 0) {
      logger.info("Password reset requested for unknown email", { email });
      return {
        success: true,
        message:
          "If an account exists with this email, a password reset link will be sent.",
      };
    }

    const user = existingUser[0]!;

    // Generate reset token
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = generateTokenExpiry(6); // 6 hours

    // Store token in database
    await db.insert(passwordResetTokens).values({
      id: generateId(),
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    logger.info("Password reset token created", { userId: user.id });

    // Send email if configured
    if (isEmailConfigured()) {
      const emailContent = passwordResetEmail(user.username, token);
      const sent = await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      if (!sent) {
        logger.error("Failed to send password reset email", { email });
      }
    } else {
      // In development without SMTP, log the reset link
      const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(
        token
      )}`;
      logger.info("Password reset link (SMTP not configured)", {
        email,
        resetUrl,
      });
    }

    return {
      success: true,
      message:
        "If an account exists with this email, a password reset link will be sent.",
      // Only include debug info in development
      ...(process.env["NODE_ENV"] !== "production" && !isEmailConfigured()
        ? { _debug: { token } }
        : {}),
    };
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    logger.error("Error in forgot-password", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw createError({
      statusCode: 500,
      statusMessage: "An error occurred. Please try again.",
    });
  }
});
