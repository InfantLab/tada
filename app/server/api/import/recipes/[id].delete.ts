import { db } from "~/server/db";
import { importRecipes } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:import:recipes:delete");

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
    // Delete the recipe (only if owned by current user)
    const deleted = await db
      .delete(importRecipes)
      .where(
        and(eq(importRecipes.id, recipeId), eq(importRecipes.userId, user.id))
      )
      .returning();

    if (deleted.length === 0) {
      throw createError(notFound(event, "Recipe"));
    }

    logger.info(`Recipe deleted: ${recipeId} by user ${user.id}`);

    return {
      success: true,
      message: "Recipe deleted successfully",
    };
  } catch (error) {
    logger.error("Error deleting recipe:", error);
    throw createError(internalError(event, "Failed to delete recipe"));
  }
});
