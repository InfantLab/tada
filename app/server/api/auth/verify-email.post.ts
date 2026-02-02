/**
 * POST /api/auth/verify-email
 *
 * Verifies a user's email address using the verification token.
 * The token is sent via email from /api/auth/send-verification.
 *
 * Request body:
 * - token: The verification token from the email link
 */

import { eq, and, isNull } from "drizzle-orm";
import { db } from "~/server/db";
import { users, emailVerificationTokens } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import { hashToken, isTokenExpired } from "~/server/utils/tokens";
import { logAuthEvent } from "~/server/utils/authEvents";

const logger = createLogger("api:auth:verify-email");

interface VerifyEmailBody {
  token: string;
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as VerifyEmailBody;

    // Validate input
    if (!body.token || typeof body.token !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Verification token is required",
      });
    }

    // Hash the token to compare with stored hash
    const tokenHash = hashToken(body.token);

    // Find the token in database
    const tokenRecords = await db
      .select({
        token: emailVerificationTokens,
        user: users,
      })
      .from(emailVerificationTokens)
      .innerJoin(users, eq(emailVerificationTokens.userId, users.id))
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.usedAt)
        )
      )
      .limit(1);

    if (tokenRecords.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Invalid or expired verification link. Please request a new one.",
      });
    }

    const { token: tokenRecord, user } = tokenRecords[0]!;

    // Check expiry
    if (isTokenExpired(tokenRecord.expiresAt)) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "This verification link has expired. Please request a new one.",
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      // Mark token as used anyway
      await db
        .update(emailVerificationTokens)
        .set({ usedAt: new Date().toISOString() })
        .where(eq(emailVerificationTokens.id, tokenRecord.id));

      return {
        success: true,
        message: "Email is already verified",
        alreadyVerified: true,
      };
    }

    // Update user and mark token as used
    const now = new Date().toISOString();

    await db
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    await db
      .update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(eq(emailVerificationTokens.id, tokenRecord.id));

    logger.info("Email verified successfully", { userId: user.id, email: user.email });

    // Log the event
    await logAuthEvent({
      event,
      userId: user.id,
      eventType: "email_verification",
      metadata: { action: "verified", email: user.email },
    });

    return {
      success: true,
      message: "Email verified successfully!",
    };
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    logger.error("Error verifying email", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw createError({
      statusCode: 500,
      statusMessage: "An error occurred. Please try again.",
    });
  }
});
