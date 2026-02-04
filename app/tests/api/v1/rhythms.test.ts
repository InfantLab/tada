/**
 * Tests for /api/v1/rhythms endpoints
 *
 * User Story 1: OpenClaw Daily Summary
 * Tests rhythm retrieval with streak data and statistics
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestEnvironment, createTestEntry } from "~/tests/api/setup";
import { db } from "~/server/db";
import { rhythms } from "~/server/db/schema";

// Import utilities
import { createApiKey } from "~/server/utils/api-key";

describe("GET /api/v1/rhythms", () => {
  let env: Awaited<ReturnType<typeof createTestEnvironment>>;

  beforeEach(async () => {
    env = await createTestEnvironment({ entryCount: 10 });

    // Create a test rhythm for mindfulness
    await db.insert(rhythms).values({
      id: crypto.randomUUID(),
      userId: env.user.id,
      name: "Daily Meditation",
      description: "Daily sitting meditation practice",
      matchType: "timed",
      matchCategory: "mindfulness",
      matchSubcategory: "sitting",
      matchName: null,
      activityMatchers: null,
      goalType: "boolean",
      goalValue: 1,
      goalUnit: "sessions",
      frequency: "daily",
      frequencyTarget: null,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      durationThresholdSeconds: 360,
      chainType: "daily",
      chainTargetMinutes: null,
      cachedChainStats: null,
      panelPreferences: {
        showYearTracker: true,
        showMonthCalendar: true,
        showChainStats: true,
        monthViewMode: "calendar",
        expandedByDefault: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("returns all rhythms with streak data", async () => {
    const response = await $fetch("/api/v1/rhythms", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
    });

    expect(response.data).toBeDefined();
    expect(response.data.length).toBeGreaterThan(0);

    const rhythm = response.data[0];
    expect(rhythm.id).toBeDefined();
    expect(rhythm.name).toBeDefined();
    expect(rhythm.streak).toBeDefined();
    expect(rhythm.streak.current).toBeDefined();
    expect(rhythm.streak.longest).toBeDefined();
    expect(rhythm.streak.lastCompleted).toBeDefined();
  });

  it("includes stats for today, thisWeek, thisMonth, allTime periods", async () => {
    const response = await $fetch("/api/v1/rhythms", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
    });

    const rhythm = response.data[0];
    expect(rhythm.stats).toBeDefined();
    expect(rhythm.stats.today).toBeDefined();
    expect(rhythm.stats.thisWeek).toBeDefined();
    expect(rhythm.stats.thisMonth).toBeDefined();
    expect(rhythm.stats.allTime).toBeDefined();

    // Each period should have session counts and total minutes
    expect(rhythm.stats.today.sessions).toBeDefined();
    expect(rhythm.stats.today.totalMinutes).toBeDefined();
    expect(rhythm.stats.today.averageDuration).toBeDefined();
  });

  it("calculates current streak correctly", async () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .split("T")[0];

    // Create entries for today and yesterday
    await createTestEntry(env.user.id, {
      timestamp: `${today}T10:00:00.000Z`,
      category: "mindfulness",
      subcategory: "sitting",
      durationSeconds: 600,
    });

    await createTestEntry(env.user.id, {
      timestamp: `${yesterday}T10:00:00.000Z`,
      category: "mindfulness",
      subcategory: "sitting",
      durationSeconds: 600,
    });

    const response = await $fetch("/api/v1/rhythms", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
    });

    const rhythm = response.data[0];
    expect(rhythm.streak.current).toBeGreaterThanOrEqual(2);
  });

  it("rejects unauthenticated requests with 401", async () => {
    await expect(
      $fetch("/api/v1/rhythms", {
        headers: {},
      }),
    ).rejects.toThrow(/401/);
  });

  it("rejects requests without rhythms:read permission with 403", async () => {
    // Create API key without rhythms:read permission
    const limitedKey = await createApiKey(env.user.id, "Limited Key", [
      "entries:read",
    ]);

    await expect(
      $fetch("/api/v1/rhythms", {
        headers: {
          Authorization: `Bearer ${limitedKey.key}`,
        },
      }),
    ).rejects.toThrow(/403/);
  });
});
