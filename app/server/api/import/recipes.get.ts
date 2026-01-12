import { db } from "~/server/db";
import { importRecipes } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:import-recipes");

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  try {
    // Get all recipes for the user (including built-in ones)
    const recipes = await db
      .select()
      .from(importRecipes)
      .where(eq(importRecipes.userId, user.id))
      .orderBy(desc(importRecipes.lastUsedAt), desc(importRecipes.createdAt));

    logger.info("Retrieved import recipes", {
      userId: user.id,
      count: recipes.length,
    });

    return {
      success: true,
      recipes,
    };
  } catch (error) {
    logger.error("Failed to retrieve recipes", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });

    throw createError({
      statusCode: 500,
      message: "Failed to retrieve recipes",
    });
  }
});
