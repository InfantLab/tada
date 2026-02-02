/**
 * POST /api/auth/send-verification
 *
 * Sends an email verification link to the current user's email address.
 * Rate limited to 1 request per minute per user.
 *
 * Requires:
 * - Authenticated user
 * - User must have an email set
 * - Email must not already be verified
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

const logger = createLogger("api:auth:send-verification");

// In-memory rate limiting (per user)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60 * 1000; // 1 minute

export default defineEventHandler(async (event) => {
  // Require authentication
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const userId = event.context.user.id;

  // Rate limiting check
  const lastRequest = rateLimitMap.get(userId);
  if (lastRequest && Date.now() - lastRequest < RATE_LIMIT_MS) {
    throw createError({
      statusCode: 429,
      statusMessage: "Please wait before requesting another verification email",
    });
  }

  try {
    // Get user with email
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

    // Check if email is set
    if (!user.email) {
      throw createError({
        statusCode: 400,
        statusMessage: "No email address set. Please add an email first.",
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return {
        success: true,
        message: "Email is already verified",
        alreadyVerified: true,
      };
    }

    // Update rate limit
    rateLimitMap.set(userId, Date.now());

    // Generate verification token (24 hour expiry)
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = generateTokenExpiry(24); // 24 hours

    // Store token in database
    await db.insert(emailVerificationTokens).values({
      id: generateId(),
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    logger.info("Email verification token created", { userId: user.id });

    // Log auth event
    await logAuthEvent({
      event,
      userId: user.id,
      eventType: "email_verification",
      metadata: { action: "token_sent", email: user.email },
    });

    // Send email if configured
    if (isEmailConfigured()) {
      const emailContent = emailVerificationEmail(user.username, token);
      const sent = await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      if (!sent) {
        logger.error("Failed to send verification email", { email: user.email });
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to send verification email. Please try again.",
        });
      }

      return {
        success: true,
        message: "Verification email sent. Please check your inbox.",
      };
    } else {
      // In development without SMTP, log the verification link
      const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
      logger.info("Email verification link (SMTP not configured)", {
        email: user.email,
        verifyUrl,
      });

      return {
        success: true,
        message: "Verification email would be sent (SMTP not configured)",
        // Only include debug info in development
        ...(process.env["NODE_ENV"] !== "production"
          ? { _debug: { token, verifyUrl } }
          : {}),
      };
    }
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    logger.error("Error in send-verification", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId,
    });

    throw createError({
      statusCode: 500,
      statusMessage: "An error occurred. Please try again.",
    });
  }
});
