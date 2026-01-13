import { db } from "~/server/db";
import { importRecipes } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:import:recipes:restore");

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

  const body = await readBody(event);
  const { versionIndex } = body;

  if (typeof versionIndex !== "number" || versionIndex < 0) {
    throw createError({
      statusCode: 400,
      message: "Valid version index is required",
    });
  }

  try {
    // Get the recipe
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

    const recipeData = recipe[0];
    if (!recipeData) {
      throw createError({
        statusCode: 404,
        message: "Recipe not found",
      });
    }

    const previousVersions =
      (recipeData.previousVersions as Array<{
        savedAt: string;
        columnMapping: Record<string, unknown>;
        transforms: Record<string, unknown>;
      }>) || [];

    if (versionIndex >= previousVersions.length) {
      throw createError({
        statusCode: 400,
        message: "Version index out of range",
      });
    }

    const versionToRestore = previousVersions[versionIndex];
    if (!versionToRestore) {
      throw createError({
        statusCode: 400,
        message: "Invalid version",
      });
    }

    // Store current version before restoring
    const currentVersion = {
      savedAt: new Date().toISOString(),
      columnMapping: recipeData.columnMapping as Record<string, unknown>,
      transforms: recipeData.transforms as Record<string, unknown>,
    };

    // Remove the restored version from history and add current
    const updatedVersions = [
      currentVersion,
      ...previousVersions.filter((_, i) => i !== versionIndex),
    ].slice(0, 3);

    // Update recipe with restored version
    const updated = await db
      .update(importRecipes)
      .set({
        columnMapping: versionToRestore.columnMapping,
        transforms: versionToRestore.transforms,
        previousVersions: updatedVersions,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(importRecipes.id, recipeId))
      .returning();

    logger.info(`Recipe restored to version ${versionIndex}: ${recipeId}`);

    return {
      success: true,
      recipe: updated[0],
    };
  } catch (error) {
    logger.error("Error restoring recipe version:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to restore recipe version",
    });
  }
});
