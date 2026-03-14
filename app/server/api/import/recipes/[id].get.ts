import { db } from "~/server/db";
import { importRecipes } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:import:recipes:get");

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError(unauthorized(event));
  }

  const recipeId = getRouterParam(event, "id");
  if (!recipeId) {
    throw createError(
      apiError(event, "RECIPE_ID_REQUIRED", "Recipe ID is required", 400)
    );
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
      throw createError(notFound(event, "Recipe"));
    }

    logger.info(`Recipe loaded: ${recipeId} by user ${user.id}`);

    return recipe[0];
  } catch (error) {
    logger.error("Error loading recipe:", error);
    throw createError(internalError(event, "Failed to load recipe"));
  }
});
