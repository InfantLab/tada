import { randomUUID } from "crypto";
import { db } from "~/server/db";
import { importRecipes } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:import-recipes");

// Built-in recipe definitions
const BUILTIN_RECIPES = [
  {
    name: "Insight Timer",
    description: "Import meditation sessions from Insight Timer CSV export. All activities are mapped to mindfulness category with their original activity type preserved.",
    columnMapping: {
      startedAt: "Started At",
      duration: "Duration",
      name: "Activity",
    },
    transforms: {
      dateFormat: "MM/DD/YYYY HH:mm:ss",
      timezone: "America/New_York",
      durationFormat: "H:mm:ss",
      defaultCategory: "mindfulness",
    },
  },
];

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  try {
    // Get all recipes for the user
    let recipes = await db
      .select()
      .from(importRecipes)
      .where(eq(importRecipes.userId, user.id))
      .orderBy(desc(importRecipes.lastUsedAt), desc(importRecipes.createdAt));

    // Ensure built-in recipes exist
    for (const builtinDef of BUILTIN_RECIPES) {
      const exists = recipes.find(
        (r) => r.isBuiltIn && r.name === builtinDef.name,
      );

      if (!exists) {
        // Create built-in recipe
        const recipeId = randomUUID();
        await db.insert(importRecipes).values({
          id: recipeId,
          userId: user.id,
          name: builtinDef.name,
          description: builtinDef.description,
          columnMapping: builtinDef.columnMapping,
          transforms: builtinDef.transforms,
          isBuiltIn: true,
          useCount: 0,
          previousVersions: [],
        });

        logger.info("Created built-in recipe", {
          recipeId,
          name: builtinDef.name,
        });

        // Reload recipes
        recipes = await db
          .select()
          .from(importRecipes)
          .where(eq(importRecipes.userId, user.id))
          .orderBy(desc(importRecipes.lastUsedAt), desc(importRecipes.createdAt));
      }
    }

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
