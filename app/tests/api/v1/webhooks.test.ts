/**
 * Tests for /api/v1/webhooks endpoints
 *
 * User Story 4: Real-time Webhooks
 * Tests webhook registration, delivery, HMAC signing, and auto-disable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestUser, cleanupTestData } from "~/tests/api/setup";
import {
  registerWebhook,
  deliverWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  testWebhook,
} from "~/server/services/webhooks";
import type { WebhookEvent } from "~/types/api";
import crypto from "crypto";

describe("POST /api/v1/webhooks", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("registers webhook with URL, secret, and event subscriptions", async () => {
    const webhookData = {
      url: "https://example.com/webhook",
      secret: "test-secret-key",
      events: ["entry.created", "streak.milestone"] as WebhookEvent[],
      description: "Test webhook",
    };

    const result = await registerWebhook(userId, webhookData);

    expect(result.id).toBeDefined();
    expect(result.url).toBe(webhookData.url);
    expect(result.events).toEqual(webhookData.events);
    expect(result.active).toBe(true);
    expect(result.description).toBe(webhookData.description);
    // Secret should not be returned
    expect(result).not.toHaveProperty("secret");
  });

  it("validates webhook URL is HTTPS (not HTTP)", async () => {
    const webhookData = {
      url: "http://example.com/webhook", // HTTP not allowed
      secret: "test-secret",
      events: ["entry.created"] as WebhookEvent[],
    };

    await expect(registerWebhook(userId, webhookData)).rejects.toThrow(
      /HTTPS required/i,
    );
  });

  it("rejects private IP addresses", async () => {
    const privateIPs = [
      "https://127.0.0.1/webhook",
      "https://localhost/webhook",
      "https://192.168.1.1/webhook",
      "https://10.0.0.1/webhook",
      "https://172.16.0.1/webhook",
    ];

    for (const url of privateIPs) {
      const webhookData = {
        url,
        secret: "test-secret",
        events: ["entry.created"] as WebhookEvent[],
      };

      await expect(registerWebhook(userId, webhookData)).rejects.toThrow(
        /private.*not allowed/i,
      );
    }
  });

  it("rejects 0.0.0.0 address", async () => {
    const webhookData = {
      url: "https://0.0.0.0/webhook",
      secret: "test-secret",
      events: ["entry.created"] as WebhookEvent[],
    };

    await expect(registerWebhook(userId, webhookData)).rejects.toThrow(
      /private.*not allowed/i,
    );
  });
});

describe("Webhook Delivery", () => {
  let userId: string;
  let webhookId: string;
  let webhookSecret: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    webhookSecret = "test-webhook-secret-123";

    // Register a test webhook
    const webhook = await registerWebhook(userId, {
      url: "https://example.com/webhook",
      secret: webhookSecret,
      events: ["entry.created"] as WebhookEvent[],
    });
    webhookId = webhook.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("delivers webhook with correct HMAC-SHA256 signature", async () => {
    const payload = {
      event: "entry.created",
      timestamp: new Date().toISOString(),
      data: {
        id: "test-entry-id",
        type: "timed",
        name: "Meditation",
        category: "mindfulness",
      },
    };

    // Mock fetch to capture the request
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });
    global.fetch = mockFetch;

    const result = await deliverWebhook(webhookId, payload);

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalled();

    // Verify HMAC signature was sent
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://example.com/webhook");
    expect(options.headers).toHaveProperty("X-Webhook-Signature");

    // Verify signature is valid
    const signature = options.headers["X-Webhook-Signature"];
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(payload))
      .digest("hex");

    expect(signature).toBe(`sha256=${expectedSignature}`);
  });

  it("includes required headers in webhook request", async () => {
    const payload = {
      event: "entry.created",
      timestamp: new Date().toISOString(),
      data: {},
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = mockFetch;

    await deliverWebhook(webhookId, payload);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["User-Agent"]).toContain("TaDa-Webhook");
    expect(options.headers["X-Webhook-Event"]).toBe(payload.event);
    expect(options.headers["X-Webhook-ID"]).toBe(webhookId);
  });

  it("retries failed webhooks with exponential backoff (1s, 5s, 25s)", async () => {
    const payload = {
      event: "entry.created",
      timestamp: new Date().toISOString(),
      data: {},
    };

    // Mock fetch to fail first 2 attempts, succeed on 3rd
    let attemptCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: true, status: 200 });
    });
    global.fetch = mockFetch;

    const startTime = Date.now();
    const result = await deliverWebhook(webhookId, payload);
    const duration = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // Should have waited ~1s + 5s = ~6s (allow some tolerance)
    expect(duration).toBeGreaterThanOrEqual(6000);
    expect(duration).toBeLessThan(8000);
  });

  it("gives up after 3 failed attempts", async () => {
    const payload = {
      event: "entry.created",
      timestamp: new Date().toISOString(),
      data: {},
    };

    // Mock fetch to always fail
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });
    global.fetch = mockFetch;

    const result = await deliverWebhook(webhookId, payload);

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.error).toContain("500");
  });
});

describe("Webhook Auto-Disable", () => {
  let userId: string;
  let webhookId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    const webhook = await registerWebhook(userId, {
      url: "https://example.com/webhook",
      secret: "test-secret",
      events: ["entry.created"] as WebhookEvent[],
    });
    webhookId = webhook.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("disables webhook after sustained failures (>50% over 20 attempts)", async () => {
    const payload = {
      event: "entry.created",
      timestamp: new Date().toISOString(),
      data: {},
    };

    // Mock fetch to fail 60% of the time
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      // Fail 12 out of 20 attempts (60% failure rate)
      const shouldFail = callCount <= 12;
      return Promise.resolve({
        ok: !shouldFail,
        status: shouldFail ? 500 : 200,
      });
    });
    global.fetch = mockFetch;

    // Simulate 20 delivery attempts
    for (let i = 0; i < 20; i++) {
      await deliverWebhook(webhookId, payload);
    }

    // Check if webhook was auto-disabled
    const webhooks = await listWebhooks(userId);
    const webhook = webhooks.find((w) => w.id === webhookId);

    expect(webhook).toBeDefined();
    expect(webhook!.active).toBe(false);
    expect(webhook!.failureRate).toBeGreaterThan(0.5);
  });

  it("does not disable webhook with acceptable failure rate (<50%)", async () => {
    const payload = {
      event: "entry.created",
      timestamp: new Date().toISOString(),
      data: {},
    };

    // Mock fetch to fail 40% of the time
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      // Fail 8 out of 20 attempts (40% failure rate)
      const shouldFail = callCount <= 8;
      return Promise.resolve({
        ok: !shouldFail,
        status: shouldFail ? 500 : 200,
      });
    });
    global.fetch = mockFetch;

    // Simulate 20 delivery attempts
    for (let i = 0; i < 20; i++) {
      await deliverWebhook(webhookId, payload);
    }

    // Check that webhook is still active
    const webhooks = await listWebhooks(userId);
    const webhook = webhooks.find((w) => w.id === webhookId);

    expect(webhook).toBeDefined();
    expect(webhook!.active).toBe(true);
    expect(webhook!.failureRate).toBeLessThanOrEqual(0.5);
  });
});

describe("GET /api/v1/webhooks", () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    // Create multiple test webhooks
    await registerWebhook(userId, {
      url: "https://example.com/webhook1",
      secret: "secret1",
      events: ["entry.created"] as WebhookEvent[],
    });

    await registerWebhook(userId, {
      url: "https://example.com/webhook2",
      secret: "secret2",
      events: ["streak.milestone", "entry.updated"] as WebhookEvent[],
    });
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("lists user's webhooks with delivery statistics", async () => {
    const webhooks = await listWebhooks(userId);

    expect(webhooks.length).toBeGreaterThanOrEqual(2);

    const webhook = webhooks[0];
    expect(webhook.id).toBeDefined();
    expect(webhook.url).toBeDefined();
    expect(webhook.events).toBeDefined();
    expect(webhook.active).toBeDefined();
    expect(webhook.createdAt).toBeDefined();

    // Should include delivery stats
    expect(webhook).toHaveProperty("totalDeliveries");
    expect(webhook).toHaveProperty("failedDeliveries");
    expect(webhook).toHaveProperty("lastDeliveredAt");

    // Should NOT include secret
    expect(webhook).not.toHaveProperty("secret");
  });
});

describe("PATCH /api/v1/webhooks/[id]", () => {
  let userId: string;
  let webhookId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    const webhook = await registerWebhook(userId, {
      url: "https://example.com/webhook",
      secret: "secret",
      events: ["entry.created"] as WebhookEvent[],
    });
    webhookId = webhook.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("updates webhook URL and events", async () => {
    const updates = {
      url: "https://example.com/new-webhook",
      events: ["entry.created", "entry.updated"] as WebhookEvent[],
    };

    const result = await updateWebhook(webhookId, userId, updates);

    expect(result.url).toBe(updates.url);
    expect(result.events).toEqual(updates.events);
  });

  it("can disable/enable webhook via active flag", async () => {
    // Disable webhook
    let result = await updateWebhook(webhookId, userId, { active: false });
    expect(result.active).toBe(false);

    // Re-enable webhook
    result = await updateWebhook(webhookId, userId, { active: true });
    expect(result.active).toBe(true);
  });

  it("validates new URL follows same rules (HTTPS, no private IPs)", async () => {
    await expect(
      updateWebhook(webhookId, userId, {
        url: "http://example.com/webhook",
      }),
    ).rejects.toThrow(/HTTPS required/i);

    await expect(
      updateWebhook(webhookId, userId, {
        url: "https://192.168.1.1/webhook",
      }),
    ).rejects.toThrow(/private.*not allowed/i);
  });
});

describe("DELETE /api/v1/webhooks/[id]", () => {
  let userId: string;
  let webhookId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    const webhook = await registerWebhook(userId, {
      url: "https://example.com/webhook",
      secret: "secret",
      events: ["entry.created"] as WebhookEvent[],
    });
    webhookId = webhook.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("deletes webhook from database", async () => {
    await deleteWebhook(webhookId, userId);

    const webhooks = await listWebhooks(userId);
    expect(webhooks.find((w) => w.id === webhookId)).toBeUndefined();
  });

  it("prevents deleting another user's webhook", async () => {
    const otherUser = await createTestUser();
    const otherUserId = otherUser.id;

    await expect(deleteWebhook(webhookId, otherUserId)).rejects.toThrow(
      /not found/i,
    );

    await cleanupTestData(otherUserId);
  });
});

describe("POST /api/v1/webhooks/[id]/test", () => {
  let userId: string;
  let webhookId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;

    const webhook = await registerWebhook(userId, {
      url: "https://example.com/webhook",
      secret: "test-secret",
      events: ["entry.created"] as WebhookEvent[],
    });
    webhookId = webhook.id;
  });

  afterEach(async () => {
    await cleanupTestData(userId);
  });

  it("sends test webhook and returns delivery result", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });
    global.fetch = mockFetch;

    const result = await testWebhook(webhookId, userId);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(mockFetch).toHaveBeenCalled();

    // Verify test payload was sent
    const [, options] = mockFetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.event).toBe("test");
    expect(payload.data.message).toContain("test");
  });

  it("returns failure details when test fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });
    global.fetch = mockFetch;

    const result = await testWebhook(webhookId, userId);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.error).toContain("404");
  });
});
