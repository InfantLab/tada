/**
 * Tests for /api/v1/import endpoints
 *
 * User Story 7: Historical Data Import
 * Tests CSV/JSON import with field mapping, validation, and duplicate detection
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestUser, cleanupTestData } from "~/tests/api/setup";
import {
  parseCSV,
  validateEntry,
  detectDuplicates,
  createPreview,
  importEntries,
} from "~/server/services/import";
import { createEntry } from "~/server/services/entries";
import type { NewEntry } from "~/server/db/schema";

describe("CSV Parsing", () => {
  it("parses CSV with custom field mapping", async () => {
    const csvData = `Date,Activity,Duration (minutes),Notes
2026-01-31,Meditation,45,Morning session
2026-01-30,Meditation,30,Evening practice`;

    const fieldMapping = {
      timestamp: "Date",
      name: "Activity",
      durationSeconds: "Duration (minutes)",
      notes: "Notes",
    };

    const result = await parseCSV(csvData, fieldMapping);

    expect(result.length).toBe(2);
    expect(result[0].name).toBe("Meditation");
    expect(result[0].durationSeconds).toBe(45 * 60); // 45 minutes in seconds
    expect(result[0].timestamp).toBeDefined();
    expect(result[1].durationSeconds).toBe(30 * 60);
  });

  it("handles missing optional fields gracefully", async () => {
    const csvData = `Date,Activity
2026-01-31,Meditation`;

    const fieldMapping = {
      timestamp: "Date",
      name: "Activity",
    };

    const result = await parseCSV(csvData, fieldMapping);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Meditation");
    expect(result[0].durationSeconds).toBeUndefined();
    expect(result[0].notes).toBeUndefined();
  });

  it("converts duration minutes to seconds", async () => {
    const csvData = `Date,Activity,Duration
2026-01-31,Running,60`;

    const fieldMapping = {
      timestamp: "Date",
      name: "Activity",
      durationSeconds: "Duration",
    };

    const result = await parseCSV(csvData, fieldMapping);

    expect(result[0].durationSeconds).toBe(3600); // 60 minutes = 3600 seconds
  });
});

describe("Entry Validation", () => {
  it("validates CSV rows and reports errors with row numbers", () => {
    const invalidEntry = {
      // Missing required timestamp
      name: "Meditation",
      type: "timed",
      durationSeconds: 1800,
    };

    const result = validateEntry(invalidEntry, 5);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rowNumber).toBe(5);
  });

  it("accepts valid entry data", () => {
    const validEntry = {
      timestamp: "2026-01-31T10:00:00Z",
      name: "Meditation",
      type: "timed",
      category: "mindfulness",
      durationSeconds: 1800,
    };

    const result = validateEntry(validEntry, 1);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("validates required fields per entry type", () => {
    // Timed entry without durationSeconds
    const timedEntry = {
      timestamp: "2026-01-31T10:00:00Z",
      name: "Running",
      type: "timed",
    };

    const result = validateEntry(timedEntry, 1);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("duration"))).toBe(true);
  });
});

describe("Duplicate Detection", () => {
  let userId: string;
  let existingEntryId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    // Create an existing entry
    const existingEntry: NewEntry = {
      id: crypto.randomUUID(),
      userId,
      type: "timed",
      name: "Meditation",
      category: "mindfulness",
      subcategory: null,
      emoji: null,
      timestamp: "2026-01-31T10:00:00Z",
      durationSeconds: 1800,
      timezone: "UTC",
      data: {},
      tags: [],
      notes: null,
      source: "import",
      externalId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    const created = await createEntry(existingEntry);
    existingEntryId = created.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("detects duplicate entries by timestamp and category", async () => {
    const newEntries = [
      {
        timestamp: "2026-01-31T10:00:00Z", // Same as existing
        name: "Meditation",
        type: "timed",
        category: "mindfulness",
        durationSeconds: 1800,
      },
      {
        timestamp: "2026-01-31T15:00:00Z", // Different time
        name: "Meditation",
        type: "timed",
        category: "mindfulness",
        durationSeconds: 1200,
      },
    ];

    const result = await detectDuplicates(userId, newEntries);

    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].timestamp).toBe("2026-01-31T10:00:00Z");
    expect(result.unique).toHaveLength(1);
    expect(result.unique[0].timestamp).toBe("2026-01-31T15:00:00Z");
  });

  it("considers entries with different categories as unique", async () => {
    const newEntries = [
      {
        timestamp: "2026-01-31T10:00:00Z", // Same time
        name: "Running",
        type: "timed",
        category: "fitness", // Different category
        durationSeconds: 1800,
      },
    ];

    const result = await detectDuplicates(userId, newEntries);

    expect(result.duplicates).toHaveLength(0);
    expect(result.unique).toHaveLength(1);
  });
});

describe("Import Preview (Dry Run)", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("dry-run mode shows preview without creating entries", async () => {
    const entries = [
      {
        timestamp: "2026-01-31T10:00:00Z",
        name: "Meditation",
        type: "timed",
        category: "mindfulness",
        durationSeconds: 1800,
      },
      {
        timestamp: "2026-01-31T15:00:00Z",
        name: "Running",
        type: "timed",
        category: "fitness",
        durationSeconds: 3600,
      },
    ];

    const preview = await createPreview(userId, entries);

    expect(preview.total).toBe(2);
    expect(preview.valid).toBe(2);
    expect(preview.invalid).toBe(0);
    expect(preview.duplicates).toBe(0);
    expect(preview.sample).toBeDefined();
    expect(preview.sample.length).toBeLessThanOrEqual(5); // Show max 5 samples
  });

  it("reports validation errors in preview", async () => {
    const entries = [
      {
        // Valid entry
        timestamp: "2026-01-31T10:00:00Z",
        name: "Meditation",
        type: "timed",
        category: "mindfulness",
        durationSeconds: 1800,
      },
      {
        // Invalid - missing required field
        name: "Running",
        type: "timed",
      },
    ];

    const preview = await createPreview(userId, entries as any);

    expect(preview.total).toBe(2);
    expect(preview.valid).toBe(1);
    expect(preview.invalid).toBe(1);
    expect(preview.errors).toBeDefined();
    expect(preview.errors.length).toBeGreaterThan(0);
  });
});

describe("Insight Timer Import", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("imports Insight Timer CSV with pre-configured mapping", async () => {
    const insightTimerCSV = `Date,Activity,Duration (minutes),Mood
2026-01-31 10:00:00,Meditation,45,Calm
2026-01-30 19:30:00,Sleep Meditation,20,Relaxed`;

    const insightTimerMapping = {
      timestamp: "Date",
      name: "Activity",
      durationSeconds: "Duration (minutes)",
      category: "mindfulness",
      subcategory: "meditation",
      type: "timed",
    };

    const parsed = await parseCSV(insightTimerCSV, insightTimerMapping);

    expect(parsed.length).toBe(2);
    expect(parsed[0].name).toBe("Meditation");
    expect(parsed[0].category).toBe("mindfulness");
    expect(parsed[0].subcategory).toBe("meditation");
    expect(parsed[0].durationSeconds).toBe(45 * 60);
    expect(parsed[1].durationSeconds).toBe(20 * 60);
  });
});

describe("Import Execution", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("creates entries with source='import'", async () => {
    const entries = [
      {
        timestamp: "2026-01-31T10:00:00Z",
        name: "Meditation",
        type: "timed",
        category: "mindfulness",
        durationSeconds: 1800,
      },
    ];

    const result = await importEntries(userId, entries);

    expect(result.created).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.entries[0].source).toBe("import");
  });

  it("skips duplicates when skipDuplicates=true", async () => {
    // Create an existing entry
    const existingEntry: NewEntry = {
      id: crypto.randomUUID(),
      userId,
      type: "timed",
      name: "Meditation",
      category: "mindfulness",
      subcategory: null,
      emoji: null,
      timestamp: "2026-01-31T10:00:00Z",
      durationSeconds: 1800,
      timezone: "UTC",
      data: {},
      tags: [],
      notes: null,
      source: "import",
      externalId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    await createEntry(existingEntry);

    // Try to import same entry
    const entries = [
      {
        timestamp: "2026-01-31T10:00:00Z",
        name: "Meditation",
        type: "timed",
        category: "mindfulness",
        durationSeconds: 1800,
      },
    ];

    const result = await importEntries(userId, entries, {
      skipDuplicates: true,
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("returns summary with counts after import", async () => {
    const entries = [
      {
        timestamp: "2026-01-31T10:00:00Z",
        name: "Meditation",
        type: "timed",
        category: "mindfulness",
        durationSeconds: 1800,
      },
      {
        timestamp: "2026-01-31T15:00:00Z",
        name: "Running",
        type: "timed",
        category: "fitness",
        durationSeconds: 3600,
      },
    ];

    const result = await importEntries(userId, entries);

    expect(result.total).toBe(2);
    expect(result.created).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });
});

describe("JSON Import", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("imports JSON array of entries", async () => {
    const jsonEntries = [
      {
        timestamp: "2026-01-31T10:00:00Z",
        name: "Meditation",
        type: "timed",
        category: "mindfulness",
        durationSeconds: 1800,
        tags: ["morning", "focused"],
      },
      {
        timestamp: "2026-01-31T15:00:00Z",
        name: "Coffee",
        type: "moment",
        category: "food",
      },
    ];

    const result = await importEntries(userId, jsonEntries);

    expect(result.created).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("validates JSON entry structure", async () => {
    const invalidJSON = [
      {
        // Missing required timestamp
        name: "Meditation",
        type: "timed",
      },
    ];

    const result = await importEntries(userId, invalidJSON as any);

    expect(result.created).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
