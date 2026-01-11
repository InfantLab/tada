/**
 * Get current session
 * Returns the authenticated user or null
 */
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("tada:api:auth:session");

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user;
    const session = event.context.session;

    return {
      user: user
        ? {
            id: user.id,
            username: user.username,
            timezone: user.timezone,
          }
        : null,
      session: session
        ? {
            id: session.id,
            expiresAt: session.expiresAt,
          }
        : null,
    };
  } catch (error: unknown) {
    logger.error("Failed to get session", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
