import { defineEventHandler, createError } from "h3";
import { lucia } from "~/server/utils/auth";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:auth:logout");

export default defineEventHandler(async (event) => {
  try {
    const sessionCookie = getCookie(event, lucia.sessionCookieName);

    if (!sessionCookie) {
      throw createError({
        statusCode: 401,
        statusMessage: "No session found",
      });
    }

    await lucia.invalidateSession(sessionCookie);

    const blankCookie = lucia.createBlankSessionCookie();
    setCookie(
      event,
      blankCookie.name,
      blankCookie.value,
      blankCookie.attributes
    );

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
