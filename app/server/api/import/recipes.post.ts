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
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const body = await readBody(event);

  // Validate request body
  if (!body || !body.name || !body.columnMapping) {
    throw createError({
      statusCode: 400,
      message: "Recipe must include name and columnMapping",
    });
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
        throw createError({
          statusCode: 404,
          message: "Recipe not found",
        });
      }

      const recipe = existing[0];

      // Check ownership
      if (recipe.userId !== user.id) {
        throw createError({
          statusCode: 403,
          message: "Forbidden",
        });
      }

      // Check if built-in (can't be modified)
      if (recipe.isBuiltIn) {
        throw createError({
          statusCode: 403,
          message: "Built-in recipes cannot be modified",
        });
      }

      // Store current version in history
      const previousVersions = recipe.previousVersions || [];
      previousVersions.unshift({
        savedAt: new Date().toISOString(),
        columnMapping: recipe.columnMapping,
        transforms: recipe.transforms,
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

    throw createError({
      statusCode: 500,
      message: "Failed to save recipe",
    });
  }
});
