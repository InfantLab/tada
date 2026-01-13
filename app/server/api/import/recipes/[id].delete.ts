import { db } from "~/server/db";
import { importRecipes } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:import:recipes:delete");

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
    // Delete the recipe (only if owned by current user)
    const deleted = await db
      .delete(importRecipes)
      .where(
        and(eq(importRecipes.id, recipeId), eq(importRecipes.userId, user.id))
      )
      .returning();

    if (deleted.length === 0) {
      throw createError({
        statusCode: 404,
        message: "Recipe not found",
      });
    }

    logger.info(`Recipe deleted: ${recipeId} by user ${user.id}`);

    return {
      success: true,
      message: "Recipe deleted successfully",
    };
  } catch (error) {
    logger.error("Error deleting recipe:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to delete recipe",
    });
  }
});
