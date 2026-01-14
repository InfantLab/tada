import { defineEventHandler, getQuery, createError } from "h3";
import { db } from "~/server/db";
import { passwordResetTokens, users } from "~/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";
import { hashToken, isTokenExpired } from "~/server/utils/tokens";

const logger = createLogger("api:auth:verify-reset-token");

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const token = query["token"];

    // Validate input
    if (!token || typeof token !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Token is required",
      });
    }

    // Hash the token to compare with stored hash
    const tokenHash = hashToken(token);

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
      logger.warn("Invalid or used password reset token attempted");
      return {
        valid: false,
        error: "Invalid or expired reset link. Please request a new one.",
      };
    }

    const { token: tokenRecord, user } = tokenRecords[0]!;

    // Check expiry
    if (isTokenExpired(tokenRecord.expiresAt)) {
      logger.info("Expired password reset token used", { userId: user.id });
      return {
        valid: false,
        error: "This reset link has expired. Please request a new one.",
      };
    }

    // Token is valid
    return {
      valid: true,
      email: user.email,
      username: user.username,
    };
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    logger.error("Error verifying reset token", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw createError({
      statusCode: 500,
      statusMessage: "An error occurred. Please try again.",
    });
  }
});
