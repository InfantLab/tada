/**
 * Webhook Service
 *
 * Handles webhook delivery with:
 * - HMAC-SHA256 payload signing
 * - Exponential backoff retry (1s, 5s, 25s)
 * - Auto-disable on sustained failures (>50% over 20 attempts)
 * - URL validation (HTTPS only, no private IPs)
 */

import crypto from "crypto";
import { db } from "~/server/db";
import { webhooks } from "~/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { WebhookEvent } from "~/types/api";

// Retry delays in milliseconds: 1s, 5s, 25s
const RETRY_DELAYS = [1000, 5000, 25000];
const MAX_ATTEMPTS = 3;

// Auto-disable thresholds
const FAILURE_RATE_THRESHOLD = 0.5; // 50%
const MIN_DELIVERIES_FOR_AUTO_DISABLE = 20;

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

interface DeliveryResult {
  success: boolean;
  attempts: number;
  statusCode?: number;
  error?: string;
}

interface RegisterWebhookData {
  url: string;
  secret: string;
  events: WebhookEvent[];
  description?: string;
}

interface UpdateWebhookData {
  url?: string;
  events?: WebhookEvent[];
  active?: boolean;
  description?: string;
}

/**
 * Validate webhook URL
 * - Must be HTTPS (not HTTP)
 * - Cannot be private IP address
 */
function validateWebhookURL(url: string): void {
  let parsedURL: URL;

  try {
    parsedURL = new URL(url);
  } catch (error) {
    throw new Error("Invalid URL format");
  }

  // Must be HTTPS
  if (parsedURL.protocol !== "https:") {
    throw new Error("HTTPS required for webhook URLs");
  }

  const hostname = parsedURL.hostname;

  // Check for localhost
  if (hostname === "localhost" || hostname === "0.0.0.0") {
    throw new Error("Private IP addresses not allowed for webhooks");
  }

  // Check for private IP ranges
  const privateIPRanges = [
    /^127\./, // 127.0.0.0/8
    /^10\./, // 10.0.0.0/8
    /^192\.168\./, // 192.168.0.0/16
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  ];

  for (const pattern of privateIPRanges) {
    if (pattern.test(hostname)) {
      throw new Error("Private IP addresses not allowed for webhooks");
    }
  }
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Wait for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Register a new webhook
 */
export async function registerWebhook(
  userId: string,
  data: RegisterWebhookData,
) {
  // Validate URL
  validateWebhookURL(data.url);

  const webhookId = crypto.randomUUID();
  const now = new Date().toISOString();

  const [webhook] = await db
    .insert(webhooks)
    .values({
      id: webhookId,
      userId,
      url: data.url,
      secret: data.secret,
      events: data.events,
      description: data.description || null,
      active: true,
      totalDeliveries: 0,
      failedDeliveries: 0,
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Don't return the secret
  const { secret, ...webhookWithoutSecret } = webhook;

  return webhookWithoutSecret;
}

/**
 * List all webhooks for a user
 */
export async function listWebhooks(userId: string) {
  const userWebhooks = await db.query.webhooks.findMany({
    where: eq(webhooks.userId, userId),
    orderBy: (webhooks, { desc }) => [desc(webhooks.createdAt)],
  });

  // Calculate failure rate and remove secrets
  return userWebhooks.map((webhook) => {
    const { secret, ...webhookData } = webhook;
    const failureRate =
      webhook.totalDeliveries > 0
        ? webhook.failedDeliveries / webhook.totalDeliveries
        : 0;

    return {
      ...webhookData,
      failureRate,
    };
  });
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  webhookId: string,
  userId: string,
  updates: UpdateWebhookData,
) {
  // Validate new URL if provided
  if (updates.url) {
    validateWebhookURL(updates.url);
  }

  // Find webhook and verify ownership
  const existingWebhook = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)),
  });

  if (!existingWebhook) {
    throw new Error("Webhook not found");
  }

  const [updated] = await db
    .update(webhooks)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(webhooks.id, webhookId))
    .returning();

  const { secret, ...webhookWithoutSecret } = updated;
  return webhookWithoutSecret;
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(webhookId: string, userId: string) {
  // Verify ownership
  const webhook = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)),
  });

  if (!webhook) {
    throw new Error("Webhook not found");
  }

  await db.delete(webhooks).where(eq(webhooks.id, webhookId));

  return { success: true };
}

/**
 * Deliver webhook with retry logic and HMAC signing
 */
export async function deliverWebhook(
  webhookId: string,
  payload: WebhookPayload,
): Promise<DeliveryResult> {
  // Get webhook details
  const webhook = await db.query.webhooks.findFirst({
    where: eq(webhooks.id, webhookId),
  });

  if (!webhook) {
    throw new Error("Webhook not found");
  }

  if (!webhook.active) {
    return {
      success: false,
      attempts: 0,
      error: "Webhook is disabled",
    };
  }

  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, webhook.secret);

  let lastError: string | undefined;
  let lastStatusCode: number | undefined;

  // Attempt delivery with exponential backoff
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TaDa-Webhook/1.0",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": payload.event,
          "X-Webhook-ID": webhookId,
        },
        body: payloadString,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      lastStatusCode = response.status;

      if (response.ok) {
        // Success! Update delivery stats
        await updateDeliveryStats(webhookId, true);

        return {
          success: true,
          attempts: attempt + 1,
          statusCode: response.status,
        };
      }

      lastError = `HTTP ${response.status}: ${response.statusText}`;

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        break;
      }
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Unknown error occurred";
    }

    // Wait before retrying (except on last attempt)
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(RETRY_DELAYS[attempt]);
    }
  }

  // All attempts failed
  await updateDeliveryStats(webhookId, false);

  return {
    success: false,
    attempts: MAX_ATTEMPTS,
    statusCode: lastStatusCode,
    error: lastError,
  };
}

/**
 * Update delivery statistics and check for auto-disable
 */
async function updateDeliveryStats(
  webhookId: string,
  success: boolean,
): Promise<void> {
  const webhook = await db.query.webhooks.findFirst({
    where: eq(webhooks.id, webhookId),
  });

  if (!webhook) return;

  const totalDeliveries = webhook.totalDeliveries + 1;
  const failedDeliveries = webhook.failedDeliveries + (success ? 0 : 1);
  const consecutiveFailures = success ? 0 : webhook.consecutiveFailures + 1;

  // Check if we should auto-disable
  let shouldDisable = false;
  if (totalDeliveries >= MIN_DELIVERIES_FOR_AUTO_DISABLE) {
    const failureRate = failedDeliveries / totalDeliveries;
    if (failureRate > FAILURE_RATE_THRESHOLD) {
      shouldDisable = true;
    }
  }

  await db
    .update(webhooks)
    .set({
      totalDeliveries,
      failedDeliveries,
      consecutiveFailures,
      lastDeliveredAt: new Date().toISOString(),
      active: shouldDisable ? false : webhook.active,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(webhooks.id, webhookId));
}

/**
 * Test webhook delivery
 */
export async function testWebhook(
  webhookId: string,
  userId: string,
): Promise<DeliveryResult> {
  // Verify ownership
  const webhook = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)),
  });

  if (!webhook) {
    throw new Error("Webhook not found");
  }

  const testPayload: WebhookPayload = {
    event: "test",
    timestamp: new Date().toISOString(),
    data: {
      message: "This is a test webhook delivery from Ta-Da!",
      webhookId,
    },
  };

  // Deliver test webhook (don't update stats for test deliveries)
  const payloadString = JSON.stringify(testPayload);
  const signature = generateSignature(payloadString, webhook.secret);

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TaDa-Webhook/1.0",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": testPayload.event,
        "X-Webhook-ID": webhookId,
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000),
    });

    return {
      success: response.ok,
      attempts: 1,
      statusCode: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    return {
      success: false,
      attempts: 1,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Trigger webhook for specific event
 * This is called from other parts of the app when events occur
 */
export async function triggerWebhooks(
  userId: string,
  event: WebhookEvent,
  data: Record<string, any>,
): Promise<void> {
  // Find all active webhooks subscribed to this event
  const activeWebhooks = await db.query.webhooks.findMany({
    where: and(eq(webhooks.userId, userId), eq(webhooks.active, true)),
  });

  const subscribedWebhooks = activeWebhooks.filter((webhook) =>
    webhook.events.includes(event),
  );

  if (subscribedWebhooks.length === 0) {
    return;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Deliver to all subscribed webhooks (fire and forget, don't await)
  // In production, this should use a proper queue (Bull, etc.)
  for (const webhook of subscribedWebhooks) {
    deliverWebhook(webhook.id, payload).catch((error) => {
      console.error(`Webhook delivery failed for ${webhook.id}:`, error);
    });
  }
}
