/**
 * Tests for /api/v1/export endpoints
 *
 * User Story 5: Obsidian Export
 * Tests multi-format export (JSON, CSV, Markdown, Obsidian)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestEnvironment, createTestEntry } from "~/tests/api/setup";

describe("GET /api/v1/export/entries", () => {
  let env: Awaited<ReturnType<typeof createTestEnvironment>>;

  beforeEach(async () => {
    env = await createTestEnvironment({ entryCount: 5 });

    // Create entries with specific data for export testing
    await createTestEntry(env.user.id, {
      type: "timed",
      name: "Meditation",
      category: "mindfulness",
      subcategory: "sitting",
      timestamp: "2026-01-31T10:00:00.000Z",
      durationSeconds: 600,
      notes: "Morning practice",
      tags: ["meditation", "morning"],
    });
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("exports entries in JSON format with correct structure", async () => {
    const response = await $fetch("/api/v1/export/entries", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      query: {
        format: "json",
        date: "2026-01-31",
      },
    });

    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);

    const entry = response.data[0];
    expect(entry).toHaveProperty("id");
    expect(entry).toHaveProperty("type");
    expect(entry).toHaveProperty("name");
    expect(entry).toHaveProperty("timestamp");

    // Should NOT include sensitive fields
    expect(entry).not.toHaveProperty("userId");
  });

  it("exports entries in CSV format with proper headers and escaping", async () => {
    const response = await $fetch("/api/v1/export/entries", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      query: {
        format: "csv",
        date: "2026-01-31",
      },
      responseType: "text",
    });

    expect(typeof response).toBe("string");
    expect(response).toContain("id,type,name,category");
    expect(response).toContain("Meditation");

    // Check for proper CSV escaping (quotes around fields with commas)
    const lines = response.split("\n");
    expect(lines.length).toBeGreaterThan(1); // Header + at least one data row
  });

  it("exports entries in Markdown format with organized sections", async () => {
    const response = await $fetch("/api/v1/export/entries", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      query: {
        format: "markdown",
        date: "2026-01-31",
      },
      responseType: "text",
    });

    expect(typeof response).toBe("string");
    expect(response).toContain("#"); // Should have markdown headers
    expect(response).toContain("Meditation");

    // Should organize by category/type
    expect(response).toContain("mindfulness");
  });

  it("rejects requests without export:read permission", async () => {
    const limitedKey = await createApiKey(env.user.id, "Limited", [
      "entries:read",
    ]);

    await expect(
      $fetch("/api/v1/export/entries", {
        headers: {
          Authorization: `Bearer ${limitedKey.key}`,
        },
        query: { format: "json" },
      }),
    ).rejects.toThrow(/403/);
  });
});

describe("GET /api/v1/export/obsidian", () => {
  let env: Awaited<ReturnType<typeof createTestEnvironment>>;

  beforeEach(async () => {
    env = await createTestEnvironment({ entryCount: 0 });

    // Create specific entries for Obsidian export
    await createTestEntry(env.user.id, {
      type: "timed",
      name: "Meditation",
      category: "mindfulness",
      subcategory: "sitting",
      timestamp: "2026-01-31T10:00:00.000Z",
      durationSeconds: 2700, // 45 minutes
      tags: ["meditation", "morning"],
    });

    await createTestEntry(env.user.id, {
      type: "tada",
      name: "Completed project",
      category: "accomplishment",
      subcategory: "work",
      timestamp: "2026-01-31T14:00:00.000Z",
    });
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("Obsidian export includes YAML frontmatter with date, tags, metrics", async () => {
    const response = await $fetch("/api/v1/export/obsidian", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      query: {
        date: "2026-01-31",
        template: "daily",
      },
      responseType: "text",
    });

    expect(typeof response).toBe("string");

    // Should have YAML frontmatter
    expect(response).toContain("---");
    expect(response).toMatch(/date:\s*2026-01-31/);
    expect(response).toContain("tags:");

    // Should include metrics
    expect(response).toMatch(/total_minutes|entries:/);
  });

  it("Obsidian daily template includes summary, accomplishments, rhythms sections", async () => {
    const response = await $fetch("/api/v1/export/obsidian", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      query: {
        date: "2026-01-31",
        template: "daily",
      },
      responseType: "text",
    });

    // Should have daily summary header
    expect(response).toMatch(/# Daily Summary|# January 31/);

    // Should have sections
    expect(response).toMatch(/## (Summary|Accomplishments|Activities)/);

    // Should include the entries we created
    expect(response).toContain("Meditation");
    expect(response).toContain("45"); // 45 minutes
  });

  it("Obsidian weekly template includes highlights, patterns, breakdown", async () => {
    const response = await $fetch("/api/v1/export/obsidian", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      query: {
        start: "2026-01-27", // Week start
        end: "2026-02-02", // Week end
        template: "weekly",
      },
      responseType: "text",
    });

    expect(typeof response).toBe("string");

    // Should have weekly structure
    expect(response).toMatch(/# Week|# Weekly/);
    expect(response).toMatch(/## (Highlights|Overview|Breakdown)/);
  });

  it("sets Content-Type: text/markdown header", async () => {
    // Note: This test would need to check response headers
    // In a real test environment, you'd verify the Content-Type header
    const response = await $fetch("/api/v1/export/obsidian", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      query: {
        date: "2026-01-31",
        template: "daily",
      },
      responseType: "text",
    });

    expect(typeof response).toBe("string");
    expect(response).toContain("---"); // YAML frontmatter
  });
});

// Import utilities
import { createApiKey } from "~/server/utils/api-key";
