#!/usr/bin/env node
/**
 * Seed script for encouragements table
 * Run with: bun run scripts/seed-encouragements.mjs
 */

import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Set DATABASE_URL to local path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
process.env.DATABASE_URL = `file:${join(__dirname, "..", "data", "db.sqlite")}`;

// Database setup using drizzle
const dbModule = await import("../server/db/index.ts");
const schemaModule = await import("../server/db/schema.ts");
const { eq } = await import("drizzle-orm");

const db = dbModule.db;
const { encouragements: encouragementsTable } = schemaModule;

const encouragementData = [
  // =========================================================================
  // Starting stage (Week 1)
  // =========================================================================
  {
    stage: "starting",
    context: "general",
    activityType: "general",
    message: "Every journey begins with a single breath",
  },
  {
    stage: "starting",
    context: "general",
    activityType: "general",
    message: "You've taken the first step. That's often the hardest one.",
  },
  {
    stage: "starting",
    context: "general",
    activityType: "mindfulness",
    message: "A moment of stillness is a gift to yourself",
  },
  {
    stage: "starting",
    context: "tier_achieved",
    activityType: "general",
    tierName: "weekly",
    message: "You showed up this week. That matters.",
  },
  {
    stage: "starting",
    context: "tier_achieved",
    activityType: "general",
    tierName: "few_times",
    message: "Three days! You're building something real.",
  },

  // =========================================================================
  // Building stage (Weeks 2-3)
  // =========================================================================
  {
    stage: "building",
    context: "general",
    activityType: "general",
    message: "A practice is forming. You can feel it.",
  },
  {
    stage: "building",
    context: "general",
    activityType: "mindfulness",
    message: "The cushion remembers you now",
  },
  {
    stage: "building",
    context: "tier_achieved",
    activityType: "general",
    tierName: "most_days",
    message: "Most days is more than most people.",
  },
  {
    stage: "building",
    context: "tier_achieved",
    activityType: "general",
    tierName: "daily",
    message: "A perfect week. Let that sink in.",
  },
  {
    stage: "building",
    context: "streak_milestone",
    activityType: "general",
    message: "Two weeks. The habit is taking root.",
  },
  {
    stage: "building",
    context: "streak_milestone",
    activityType: "mindfulness",
    message: "14 days of presence. Your mind is changing.",
  },

  // =========================================================================
  // Becoming stage (4+ weeks consistent)
  // =========================================================================
  {
    stage: "becoming",
    context: "general",
    activityType: "mindfulness",
    message: "You're becoming a meditator",
  },
  {
    stage: "becoming",
    context: "general",
    activityType: "general",
    message: "This is who you are now",
  },
  {
    stage: "becoming",
    context: "general",
    activityType: "general",
    message: "The practice practices you now",
  },
  {
    stage: "becoming",
    context: "tier_achieved",
    activityType: "general",
    tierName: "daily",
    message: "Daily practice. You're living the life.",
  },
  {
    stage: "becoming",
    context: "tier_achieved",
    activityType: "general",
    tierName: "most_days",
    message: "Consistency without rigidity. That's wisdom.",
  },
  {
    stage: "becoming",
    context: "streak_milestone",
    activityType: "general",
    message: "Look how far you've come",
  },
  {
    stage: "becoming",
    context: "streak_milestone",
    activityType: "mindfulness",
    message: "A month of mindfulness. You are different now.",
  },

  // =========================================================================
  // Mid-week nudges (context-specific, all stages)
  // =========================================================================
  {
    stage: "building",
    context: "mid_week_nudge",
    activityType: "general",
    message: "{remaining} more times this week to hit {tier}",
  },
  {
    stage: "becoming",
    context: "mid_week_nudge",
    activityType: "general",
    message: "Keep the momentum going—{remaining} to go",
  },
  {
    stage: "starting",
    context: "mid_week_nudge",
    activityType: "general",
    message: "Just {remaining} more to make this week count",
  },
];

async function seedEncouragements() {
  console.log("🌱 Seeding encouragements...");

  let inserted = 0;
  let skipped = 0;

  for (const enc of encouragementData) {
    const id = randomUUID();

    // Check if this message already exists
    const existing = await db
      .select()
      .from(encouragementsTable)
      .where(eq(encouragementsTable.message, enc.message))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    try {
      await db.insert(encouragementsTable).values({
        id,
        stage: enc.stage,
        context: enc.context,
        activityType: enc.activityType,
        message: enc.message,
        tierName: enc.tierName || null,
        isActive: true,
      });
      inserted++;
    } catch (error) {
      console.error(`Failed to insert: ${enc.message}`, error.message);
      skipped++;
    }
  }

  console.log(`✓ Inserted ${inserted} encouragements`);
  if (skipped > 0) {
    console.log(`  Skipped ${skipped} (already exist or failed)`);
  }
}

seedEncouragements()
  .then(() => {
    console.log("✅ Encouragements seeding complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
