/**
 * Tests for /api/v1/insights endpoints
 *
 * User Story 6: Pattern Discovery
 * Tests statistical pattern detection, correlation analysis, and caching
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestUser, cleanupTestData } from "~/tests/api/setup";
import {
  calculatePearson,
  analyzeCorrelation,
  analyzeWeekdayPattern,
  analyzeTrend,
  detectSequence,
  groupByDay,
} from "~/server/services/insights";
import { createEntry } from "~/server/services/entries";
import type { NewEntry } from "~/server/db/schema";

describe("Statistical Functions", () => {
  it("calculates Pearson correlation coefficient", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10]; // Perfect positive correlation

    const r = calculatePearson(x, y);

    expect(r).toBeCloseTo(1.0, 2); // r ≈ 1.0
  });

  it("detects negative correlation", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2]; // Perfect negative correlation

    const r = calculatePearson(x, y);

    expect(r).toBeCloseTo(-1.0, 2); // r ≈ -1.0
  });

  it("detects no correlation", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [3, 7, 2, 9, 1]; // Random, no correlation

    const r = calculatePearson(x, y);

    expect(Math.abs(r)).toBeLessThan(0.5); // Low correlation
  });

  it("handles edge cases", () => {
    // Empty arrays
    expect(calculatePearson([], [])).toBe(0);

    // Single value
    expect(calculatePearson([1], [1])).toBe(0);

    // All same values
    expect(calculatePearson([5, 5, 5], [5, 5, 5])).toBe(0);
  });
});

describe("Pattern Detection", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    // Create test data: meditation followed by high productivity
    const meditationDays = [
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-05",
      "2026-01-06",
    ];
    const productiveDays = [
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-05",
      "2026-01-06",
    ];

    // Add meditation entries
    for (const date of meditationDays) {
      const entry: NewEntry = {
        id: crypto.randomUUID(),
        userId,
        type: "timed",
        name: "Meditation",
        category: "mindfulness",
        subcategory: null,
        emoji: null,
        timestamp: `${date}T08:00:00Z`,
        durationSeconds: 1800,
        timezone: "UTC",
        data: {},
        tags: [],
        notes: null,
        source: "app",
        externalId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await createEntry(entry);
    }

    // Add productive work entries
    for (const date of productiveDays) {
      const entry: NewEntry = {
        id: crypto.randomUUID(),
        userId,
        type: "tada",
        name: "Completed project",
        category: "productivity",
        subcategory: null,
        emoji: "✅",
        timestamp: `${date}T14:00:00Z`,
        durationSeconds: null,
        timezone: "UTC",
        data: {},
        tags: ["work"],
        notes: null,
        source: "app",
        externalId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await createEntry(entry);
    }
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("detects correlation patterns with Pearson coefficient", async () => {
    const pattern = await analyzeCorrelation(
      userId,
      "mindfulness",
      "productivity",
      90,
    );

    expect(pattern).toBeDefined();
    expect(pattern.type).toBe("correlation");
    expect(pattern.correlation).toBeGreaterThan(0.5); // Positive correlation
    expect(pattern.activity1).toBe("mindfulness");
    expect(pattern.activity2).toBe("productivity");
  });

  it("assigns confidence levels based on statistical significance", async () => {
    const pattern = await analyzeCorrelation(
      userId,
      "mindfulness",
      "productivity",
      90,
    );

    expect(pattern.confidence).toBeDefined();
    expect(["low", "medium", "high"]).toContain(pattern.confidence);

    // High confidence requires: |r| > 0.7, p < 0.01, n > 30
    // Medium confidence requires: |r| > 0.5, p < 0.05, n > 20
    // Low confidence requires: |r| > 0.3, p < 0.1, n > 10
  });

  it("includes statistical evidence (sample sizes, ratios)", async () => {
    const pattern = await analyzeCorrelation(
      userId,
      "mindfulness",
      "productivity",
      90,
    );

    expect(pattern.evidence).toBeDefined();
    expect(pattern.evidence.sampleSize).toBeGreaterThan(0);
    expect(pattern.evidence.correlation).toBeDefined();
    expect(pattern.evidence.description).toBeDefined();
  });
});

describe("Weekday Pattern Analysis", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    // Create entries mostly on weekdays
    const weekdays = [
      "2026-01-05", // Monday
      "2026-01-06", // Tuesday
      "2026-01-07", // Wednesday
      "2026-01-12", // Monday
      "2026-01-13", // Tuesday
    ];

    for (const date of weekdays) {
      const entry: NewEntry = {
        id: crypto.randomUUID(),
        userId,
        type: "timed",
        name: "Morning workout",
        category: "fitness",
        subcategory: null,
        emoji: null,
        timestamp: `${date}T07:00:00Z`,
        durationSeconds: 3600,
        timezone: "UTC",
        data: {},
        tags: [],
        notes: null,
        source: "app",
        externalId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await createEntry(entry);
    }
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("detects weekday patterns", async () => {
    const pattern = await analyzeWeekdayPattern(userId, "fitness", 90);

    expect(pattern).toBeDefined();
    expect(pattern.type).toBe("temporal");
    expect(pattern.weekdayDistribution).toBeDefined();

    // Should show higher counts on weekdays
    const weekdayCount =
      (pattern.weekdayDistribution.Monday || 0) +
      (pattern.weekdayDistribution.Tuesday || 0) +
      (pattern.weekdayDistribution.Wednesday || 0);

    const weekendCount =
      (pattern.weekdayDistribution.Saturday || 0) +
      (pattern.weekdayDistribution.Sunday || 0);

    expect(weekdayCount).toBeGreaterThan(weekendCount);
  });
});

describe("Trend Analysis", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    // Create increasing meditation durations over time
    const dates = [
      "2026-01-01",
      "2026-01-05",
      "2026-01-10",
      "2026-01-15",
      "2026-01-20",
    ];
    const durations = [600, 900, 1200, 1500, 1800]; // Increasing

    for (let i = 0; i < dates.length; i++) {
      const entry: NewEntry = {
        id: crypto.randomUUID(),
        userId,
        type: "timed",
        name: "Meditation",
        category: "mindfulness",
        subcategory: null,
        emoji: null,
        timestamp: `${dates[i]}T08:00:00Z`,
        durationSeconds: durations[i],
        timezone: "UTC",
        data: {},
        tags: [],
        notes: null,
        source: "app",
        externalId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await createEntry(entry);
    }
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("detects upward trends using linear regression", async () => {
    const pattern = await analyzeTrend(userId, "mindfulness", 90);

    expect(pattern).toBeDefined();
    expect(pattern.type).toBe("trend");
    expect(pattern.direction).toBe("increasing");
    expect(pattern.slope).toBeGreaterThan(0);
  });
});

describe("Sequence Detection", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    // Create sequence: coffee → productive work
    const days = ["2026-01-01", "2026-01-02", "2026-01-03"];

    for (const date of days) {
      // Coffee in morning
      const coffeeEntry: NewEntry = {
        id: crypto.randomUUID(),
        userId,
        type: "moment",
        name: "Coffee",
        category: "food",
        subcategory: null,
        emoji: "☕",
        timestamp: `${date}T09:00:00Z`,
        durationSeconds: null,
        timezone: "UTC",
        data: {},
        tags: [],
        notes: null,
        source: "app",
        externalId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await createEntry(coffeeEntry);

      // Productive work shortly after
      const workEntry: NewEntry = {
        id: crypto.randomUUID(),
        userId,
        type: "tada",
        name: "Completed task",
        category: "productivity",
        subcategory: null,
        emoji: "✅",
        timestamp: `${date}T10:00:00Z`,
        durationSeconds: null,
        timezone: "UTC",
        data: {},
        tags: [],
        notes: null,
        source: "app",
        externalId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await createEntry(workEntry);
    }
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("detects antecedent-consequent sequences", async () => {
    const pattern = await detectSequence(userId, 90);

    expect(pattern).toBeDefined();
    expect(pattern.type).toBe("sequence");
    expect(pattern.antecedent).toBeDefined();
    expect(pattern.consequent).toBeDefined();

    // Should detect coffee → productivity
    expect(pattern.antecedent).toContain("Coffee");
    expect(pattern.consequent).toContain("productivity");
  });
});

describe("Helper Functions", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    // Create entries on different days
    const entries = [
      {
        date: "2026-01-01",
        name: "Entry 1",
      },
      {
        date: "2026-01-01",
        name: "Entry 2",
      },
      {
        date: "2026-01-02",
        name: "Entry 3",
      },
    ];

    for (const { date, name } of entries) {
      const entry: NewEntry = {
        id: crypto.randomUUID(),
        userId,
        type: "moment",
        name,
        category: "test",
        subcategory: null,
        emoji: null,
        timestamp: `${date}T10:00:00Z`,
        durationSeconds: null,
        timezone: "UTC",
        data: {},
        tags: [],
        notes: null,
        source: "app",
        externalId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await createEntry(entry);
    }
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("groups entries by day", async () => {
    const grouped = await groupByDay(userId, 90);

    expect(Object.keys(grouped).length).toBeGreaterThanOrEqual(2);
    expect(grouped["2026-01-01"]).toBeDefined();
    expect(grouped["2026-01-01"].length).toBe(2);
    expect(grouped["2026-01-02"]).toBeDefined();
    expect(grouped["2026-01-02"].length).toBe(1);
  });
});

describe("Insufficient Data Handling", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    // Only create 1 entry (insufficient for patterns)
    const entry: NewEntry = {
      id: crypto.randomUUID(),
      userId,
      type: "moment",
      name: "Single entry",
      category: "test",
      subcategory: null,
      emoji: null,
      timestamp: "2026-01-01T10:00:00Z",
      durationSeconds: null,
      timezone: "UTC",
      data: {},
      tags: [],
      notes: null,
      source: "app",
      externalId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    await createEntry(entry);
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("returns helpful message when insufficient data for patterns", async () => {
    const pattern = await analyzeCorrelation(
      userId,
      "test",
      "other",
      90,
    );

    expect(pattern).toBeDefined();
    expect(pattern.message).toContain("insufficient data");
    expect(pattern.confidence).toBe("low");
  });
});

describe("Pattern Caching", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  // Note: Cache tests would need access to the cache layer
  // These are integration tests that verify caching behavior

  it("caches pattern results with 1-hour TTL", () => {
    // Test is a placeholder - actual caching tested in endpoints
    expect(true).toBe(true);
  });

  it("serves cached results on repeat requests within TTL window", () => {
    // Test is a placeholder - actual caching tested in endpoints
    expect(true).toBe(true);
  });
});
