import { defineEventHandler } from "h3";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:auth:has-users");

export default defineEventHandler(async () => {
  try {
    const allUsers = await db.select().from(users).limit(1);

    logger.debug("Checking if users exist", { count: allUsers.length });

    return {
      hasUsers: allUsers.length > 0,
    };
  } catch (error: unknown) {
    logger.error("Failed to check users", error);
    return {
      hasUsers: false,
    };
  }
});
