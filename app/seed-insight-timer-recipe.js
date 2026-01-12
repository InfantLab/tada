#!/usr/bin/env node
/**
 * Seed Insight Timer built-in import recipe
 * This can be run manually or as part of migrations
 */

import { randomUUID } from "crypto";

// Database setup
let db, importRecipes, users, eq;

if (typeof Bun !== "undefined") {
  // Bun runtime
  const dbModule = await import("./server/db/index.ts");
  const schemaModule = await import("./server/db/schema.ts");
  const drizzleModule = await import("drizzle-orm");

  db = dbModule.db;
  importRecipes = schemaModule.importRecipes;
  users = schemaModule.users;
  eq = drizzleModule.eq;
} else {
  // Node runtime
  const dbModule = await import("./server/db/index.ts");
  const schemaModule = await import("./server/db/schema.ts");
  const drizzleModule = await import("drizzle-orm");

  db = dbModule.db;
  importRecipes = schemaModule.importRecipes;
  users = schemaModule.users;
  eq = drizzleModule.eq;
}

async function seedInsightTimerRecipe() {
  console.log("🌱 Seeding Insight Timer import recipe...");

  // Get the first user (or create a system user)
  const allUsers = await db.select().from(users).limit(1);

  if (allUsers.length === 0) {
    console.log("❌ No users found. Please create a user first.");
    process.exit(1);
  }

  const userId = allUsers[0].id;

  // Check if recipe already exists
  const existing = await db
    .select()
    .from(importRecipes)
    .where(eq(importRecipes.name, "Insight Timer"))
    .limit(1);

  if (existing.length > 0) {
    console.log("✅ Insight Timer recipe already exists");
    return;
  }

  // Create Insight Timer recipe
  const recipeId = randomUUID();

  await db.insert(importRecipes).values({
    id: recipeId,
    userId,
    name: "Insight Timer",
    description:
      "Import meditation sessions from Insight Timer CSV export. All activities are mapped to mindfulness category with their original activity type preserved.",

    columnMapping: {
      startedAt: "Started At",
      duration: "Duration",
      name: "Activity", // Maps to subcategory (Meditation, Breathing, etc.)
    },

    transforms: {
      dateFormat: "MM/DD/YYYY HH:mm:ss",
      timezone: "America/New_York", // Default, user can override
      durationFormat: "H:mm:ss",
      defaultCategory: "mindfulness",
      // defaultSubcategory will be derived from Activity column
    },

    isBuiltIn: true,
    useCount: 0,
    previousVersions: [],
  });

  console.log("✅ Insight Timer recipe created successfully");
  console.log(`   Recipe ID: ${recipeId}`);
  console.log(`   User ID: ${userId}`);
}

seedInsightTimerRecipe()
  .then(() => {
    console.log("🎉 Seeding complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
