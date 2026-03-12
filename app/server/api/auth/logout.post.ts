import { defineEventHandler, createError } from "h3";
import { invalidateSession, clearSessionCookie } from "~/server/utils/auth";
import { createLogger } from "~/server/utils/logger";

const SESSION_COOKIE_NAME = "auth_session";
const logger = createLogger("api:auth:logout");

export default defineEventHandler(async (event) => {
  try {
    const sessionId = getCookie(event, SESSION_COOKIE_NAME);

    if (!sessionId) {
      throw createError({
        statusCode: 401,
        statusMessage: "No session found",
      });
    }

    await invalidateSession(sessionId);
    clearSessionCookie(event);

    logger.info("User logged out successfully");

    return {
      success: true,
    };
  } catch (error: unknown) {
    logger.error("Logout failed", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Logout failed",
    });
  }
});
