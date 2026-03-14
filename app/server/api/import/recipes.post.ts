import { randomUUID } from "crypto";
import { db } from "~/server/db";
import { importRecipes } from "~/server/db/schema";
import { createLogger } from "~/server/utils/logger";
import { eq } from "drizzle-orm";

const logger = createLogger("api:import-recipes");

const MAX_VERSION_HISTORY = 3;

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError(unauthorized(event));
  }

  const body = await readBody(event);

  // Validate request body
  if (!body || !body.name || !body.columnMapping) {
    throw createError(
      apiError(event, "INVALID_RECIPE", "Recipe must include name and columnMapping", 400)
    );
  }

  const { id, name, description, columnMapping, transforms } = body;

  try {
    if (id) {
      // Update existing recipe
      const existing = await db
        .select()
        .from(importRecipes)
        .where(eq(importRecipes.id, id))
        .limit(1);

      if (existing.length === 0) {
        throw createError(notFound(event, "Recipe"));
      }

      const recipe = existing[0];

      // Check ownership
      if (!recipe || recipe.userId !== user.id) {
        throw createError(forbidden(event));
      }

      // Check if built-in (can't be modified)
      if (!recipe || recipe.isBuiltIn) {
        throw createError(forbidden(event, "Built-in recipes cannot be modified"));
      }

      // Store current version in history (recipe is guaranteed non-null here)
      if (!recipe) {
        throw createError(notFound(event, "Recipe"));
      }
      const previousVersions = recipe.previousVersions || [];
      previousVersions.unshift({
        savedAt: new Date().toISOString(),
        columnMapping: recipe.columnMapping ?? {},
        transforms: recipe.transforms ?? {},
      });

      // Keep only last N versions
      const trimmedHistory = previousVersions.slice(0, MAX_VERSION_HISTORY);

      // Update recipe
      await db
        .update(importRecipes)
        .set({
          name,
          description,
          columnMapping,
          transforms,
          previousVersions: trimmedHistory,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(importRecipes.id, id));

      logger.info("Updated import recipe", {
        recipeId: id,
        userId: user.id,
        name,
      });

      return {
        success: true,
        recipe: {
          id,
          name,
          description,
          columnMapping,
          transforms,
        },
      };
    } else {
      // Create new recipe
      const recipeId = randomUUID();

      await db.insert(importRecipes).values({
        id: recipeId,
        userId: user.id,
        name,
        description,
        columnMapping,
        transforms,
        isBuiltIn: false,
        useCount: 0,
        previousVersions: [],
      });

      logger.info("Created import recipe", {
        recipeId,
        userId: user.id,
        name,
      });

      return {
        success: true,
        recipe: {
          id: recipeId,
          name,
          description,
          columnMapping,
          transforms,
        },
      };
    }
  } catch (error) {
    logger.error("Failed to save recipe", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }

    throw createError(internalError(event, "Failed to save recipe"));
  }
});
