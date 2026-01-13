import { db } from "~/server/db";
import { importRecipes } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:import:recipes:get");

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const recipeId = getRouterParam(event, "id");
  if (!recipeId) {
    throw createError({
      statusCode: 400,
      message: "Recipe ID is required",
    });
  }

  try {
    const recipe = await db
      .select()
      .from(importRecipes)
      .where(
        and(eq(importRecipes.id, recipeId), eq(importRecipes.userId, user.id))
      )
      .limit(1);

    if (recipe.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Recipe not found",
      });
    }

    logger.info(`Recipe loaded: ${recipeId} by user ${user.id}`);

    return recipe[0];
  } catch (error) {
    logger.error("Error loading recipe:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to load recipe",
    });
  }
});
