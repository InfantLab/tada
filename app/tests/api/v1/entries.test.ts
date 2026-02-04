/**
 * Tests for /api/v1/entries endpoints
 *
 * User Story 1: OpenClaw Daily Summary
 * Tests entry retrieval with filtering, pagination, and authentication
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestEnvironment, createTestEntry } from "~/tests/api/setup";

// Import utilities
import { createApiKey } from "~/server/utils/api-key";
import { deleteEntry } from "~/server/services/entries";

describe("GET /api/v1/entries", () => {
  let env: Awaited<ReturnType<typeof createTestEnvironment>>;

  beforeEach(async () => {
    env = await createTestEnvironment({ entryCount: 10 });
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("returns entries for authenticated user", async () => {
    const response = await $fetch("/api/v1/entries", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
    });

    expect(response.data).toBeDefined();
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.meta).toBeDefined();
    expect(response.meta.total).toBeGreaterThanOrEqual(10);
  });

  it("returns entries for specific date", async () => {
    const testDate = "2026-01-31";

    // Create entry with specific date
    await createTestEntry(env.user.id, {
      timestamp: `${testDate}T10:00:00.000Z`,
      category: "mindfulness",
    });

    const response = await $fetch("/api/v1/entries", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      query: {
        date: testDate,
      },
    });

    expect(response.data).toBeDefined();
    expect(response.data.length).toBeGreaterThan(0);

    // All results should be from the specified date
    for (const entry of response.data) {
      expect(entry.timestamp).toContain(testDate);
    }
  });

  it("filters by category=mindfulness", async () => {
    // Create some mindfulness entries
    await createTestEntry(env.user.id, {
      category: "mindfulness",
      subcategory: "sitting",
    });

    await createTestEntry(env.user.id, {
      category: "movement",
      subcategory: "running",
    });

    const response = await $fetch("/api/v1/entries", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      query: {
        category: "mindfulness",
      },
    });

    expect(response.data).toBeDefined();

    // All results should have category "mindfulness"
    for (const entry of response.data) {
      expect(entry.category).toBe("mindfulness");
    }
  });

  it("rejects unauthenticated requests with 401", async () => {
    await expect(
      $fetch("/api/v1/entries", {
        headers: {},
      }),
    ).rejects.toThrow(/401/);
  });

  it("rejects requests without entries:read permission with 403", async () => {
    // Create API key without entries:read permission
    const limitedKey = await createApiKey(env.user.id, "Limited Key", [
      "webhooks:manage",
    ]);

    await expect(
      $fetch("/api/v1/entries", {
        headers: {
          Authorization: `Bearer ${limitedKey.key}`,
        },
      }),
    ).rejects.toThrow(/403/);
  });

  it("respects pagination with limit and offset", async () => {
    const response1 = await $fetch("/api/v1/entries", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      query: {
        limit: "5",
        offset: "0",
      },
    });

    expect(response1.data.length).toBeLessThanOrEqual(5);
    expect(response1.meta.limit).toBe(5);
    expect(response1.meta.offset).toBe(0);
    expect(response1.meta.hasMore).toBeDefined();

    const response2 = await $fetch("/api/v1/entries", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      query: {
        limit: "5",
        offset: "5",
      },
    });

    expect(response2.data.length).toBeGreaterThan(0);
    expect(response2.meta.offset).toBe(5);
  });

  it("sorts entries by timestamp desc by default", async () => {
    const response = await $fetch("/api/v1/entries", {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
    });

    const timestamps = response.data.map((e: any) => new Date(e.timestamp).getTime());

    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
    }
  });
});

describe("GET /api/v1/entries/[id]", () => {
  let env: Awaited<ReturnType<typeof createTestEnvironment>>;
  let testEntryId: string;

  beforeEach(async () => {
    env = await createTestEnvironment({ entryCount: 1 });
    testEntryId = env.entryIds[0];
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("returns single entry by ID", async () => {
    const response = await $fetch(`/api/v1/entries/${testEntryId}`, {
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
    });

    expect(response.data).toBeDefined();
    expect(response.data.id).toBe(testEntryId);
    expect(response.data.userId).toBe(env.user.id);
  });

  it("returns 404 for non-existent entry", async () => {
    const fakeId = crypto.randomUUID();

    await expect(
      $fetch(`/api/v1/entries/${fakeId}`, {
        headers: {
          Authorization: `Bearer ${env.apiKey.key}`,
        },
      }),
    ).rejects.toThrow(/404/);
  });

  it("returns 404 for deleted entry", async () => {
    // Soft delete the entry
    await deleteEntry(testEntryId, env.user.id);

    await expect(
      $fetch(`/api/v1/entries/${testEntryId}`, {
        headers: {
          Authorization: `Bearer ${env.apiKey.key}`,
        },
      }),
    ).rejects.toThrow(/404/);
  });
});

describe("POST /api/v1/entries", () => {
  let env: Awaited<ReturnType<typeof createTestEnvironment>>;

  beforeEach(async () => {
    env = await createTestEnvironment({ entryCount: 0 });
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("creates timed entry with valid data", async () => {
    const entryData = {
      type: "timed",
      name: "Meditation",
      category: "mindfulness",
      subcategory: "sitting",
      timestamp: new Date().toISOString(),
      durationSeconds: 600,
      timezone: "UTC",
    };

    const response = await $fetch("/api/v1/entries", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      body: entryData,
    });

    expect(response.data).toBeDefined();
    expect(response.data.id).toBeDefined();
    expect(response.data.type).toBe("timed");
    expect(response.data.name).toBe("Meditation");
    expect(response.data.source).toBe("api");
    expect(response.meta.created).toBe(true);
  });

  it("validates required fields for each entry type", async () => {
    // Timed entry without duration should fail
    const timedWithoutDuration = {
      type: "timed",
      name: "Meditation",
      timestamp: new Date().toISOString(),
    };

    await expect(
      $fetch("/api/v1/entries", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.apiKey.key}`,
        },
        body: timedWithoutDuration,
      }),
    ).rejects.toThrow(/422/);

    // Tada entry without name should fail
    const tadaWithoutName = {
      type: "tada",
      timestamp: new Date().toISOString(),
    };

    await expect(
      $fetch("/api/v1/entries", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.apiKey.key}`,
        },
        body: tadaWithoutName,
      }),
    ).rejects.toThrow(/422/);
  });

  it("sets source field to 'api' for API-created entries", async () => {
    const entryData = {
      type: "timed",
      name: "Meditation",
      timestamp: new Date().toISOString(),
      durationSeconds: 600,
    };

    const response = await $fetch("/api/v1/entries", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      body: entryData,
    });

    expect(response.data.source).toBe("api");
  });

  it("rejects requests without entries:write permission", async () => {
    const limitedKey = await createApiKey(env.user.id, "Read Only", [
      "entries:read",
    ]);

    const entryData = {
      type: "timed",
      name: "Test",
      timestamp: new Date().toISOString(),
      durationSeconds: 600,
    };

    await expect(
      $fetch("/api/v1/entries", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${limitedKey.key}`,
        },
        body: entryData,
      }),
    ).rejects.toThrow(/403/);
  });
});

describe("PATCH /api/v1/entries/[id]", () => {
  let env: Awaited<ReturnType<typeof createTestEnvironment>>;
  let testEntryId: string;

  beforeEach(async () => {
    env = await createTestEnvironment({ entryCount: 1 });
    testEntryId = env.entryIds[0];
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("updates existing entry with PATCH request", async () => {
    const updates = {
      notes: "Updated notes",
      tags: ["meditation", "morning"],
    };

    const response = await $fetch(`/api/v1/entries/${testEntryId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      body: updates,
    });

    expect(response.data).toBeDefined();
    expect(response.data.id).toBe(testEntryId);
    expect(response.data.notes).toBe("Updated notes");
    expect(response.data.tags).toEqual(["meditation", "morning"]);
  });

  it("rejects requests without entries:write permission", async () => {
    const limitedKey = await createApiKey(env.user.id, "Read Only", [
      "entries:read",
    ]);

    await expect(
      $fetch(`/api/v1/entries/${testEntryId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${limitedKey.key}`,
        },
        body: { notes: "Test" },
      }),
    ).rejects.toThrow(/403/);
  });

  it("returns 404 for non-existent entry", async () => {
    const fakeId = crypto.randomUUID();

    await expect(
      $fetch(`/api/v1/entries/${fakeId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${env.apiKey.key}`,
        },
        body: { notes: "Test" },
      }),
    ).rejects.toThrow(/404/);
  });
});

describe("DELETE /api/v1/entries/[id]", () => {
  let env: Awaited<ReturnType<typeof createTestEnvironment>>;
  let testEntryId: string;

  beforeEach(async () => {
    env = await createTestEnvironment({ entryCount: 1 });
    testEntryId = env.entryIds[0];
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("soft deletes entry with DELETE request", async () => {
    const response = await $fetch(`/api/v1/entries/${testEntryId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
    });

    expect(response.meta.deleted).toBe(true);

    // Verify entry is no longer accessible
    await expect(
      $fetch(`/api/v1/entries/${testEntryId}`, {
        headers: {
          Authorization: `Bearer ${env.apiKey.key}`,
        },
      }),
    ).rejects.toThrow(/404/);
  });

  it("rejects requests without entries:write permission", async () => {
    const limitedKey = await createApiKey(env.user.id, "Read Only", [
      "entries:read",
    ]);

    await expect(
      $fetch(`/api/v1/entries/${testEntryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${limitedKey.key}`,
        },
      }),
    ).rejects.toThrow(/403/);
  });
});

describe("POST /api/v1/entries/bulk", () => {
  let env: Awaited<ReturnType<typeof createTestEnvironment>>;

  beforeEach(async () => {
    env = await createTestEnvironment({ entryCount: 2 });
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("creates multiple entries in bulk", async () => {
    const bulkData = {
      operations: [
        {
          operation: "create",
          data: {
            type: "timed",
            name: "Meditation 1",
            timestamp: new Date().toISOString(),
            durationSeconds: 600,
          },
        },
        {
          operation: "create",
          data: {
            type: "timed",
            name: "Meditation 2",
            timestamp: new Date().toISOString(),
            durationSeconds: 720,
          },
        },
      ],
    };

    const response = await $fetch("/api/v1/entries/bulk", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      body: bulkData,
    });

    expect(response.data).toBeDefined();
    expect(response.data.summary).toBeDefined();
    expect(response.data.summary.total).toBe(2);
    expect(response.data.summary.successful).toBe(2);
    expect(response.data.summary.failed).toBe(0);
  });

  it("returns atomic success/failure reporting", async () => {
    const bulkData = {
      operations: [
        {
          operation: "create",
          data: {
            type: "timed",
            name: "Valid Entry",
            timestamp: new Date().toISOString(),
            durationSeconds: 600,
          },
        },
        {
          operation: "create",
          data: {
            type: "timed",
            // Missing required name field
            timestamp: new Date().toISOString(),
          },
        },
      ],
    };

    const response = await $fetch("/api/v1/entries/bulk", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.apiKey.key}`,
      },
      body: bulkData,
    });

    expect(response.data.summary.total).toBe(2);
    expect(response.data.summary.successful).toBeGreaterThan(0);
    expect(response.data.summary.failed).toBeGreaterThan(0);
    expect(response.data.results).toBeDefined();
  });
});
