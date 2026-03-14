/**
 * Unit tests for ~/server/services/stripe.ts
 *
 * Covers:
 *   - getStripe (returns null when not configured)
 *   - getOrCreateCustomer (existing vs new customer)
 *   - createCheckoutSession (valid/invalid params)
 *   - createPortalSession
 *   - handleWebhookEvent (all event types)
 *   - getSubscriptionPeriodEnd (via handleWebhookEvent integration)
 *   - logSubscriptionEvent
 *   - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getStripe,
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  handleWebhookEvent,
  logSubscriptionEvent,
} from "~/server/services/stripe";
import { isBillingEnabled } from "~/server/utils/cloudMode";

// ---------------------------------------------------------------------------
// Hoisted mocks — run before any module-level imports
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  // Chainable drizzle mock
  function createChainableMock(resolveValue: unknown = []) {
    const chain: Record<string, ReturnType<typeof vi.fn>> & {
      then: ReturnType<typeof vi.fn>;
    } = {} as any;
    chain.then = vi.fn((resolve?: (v: unknown) => unknown) =>
      Promise.resolve(undefined).then(resolve),
    );
    chain.select = vi.fn().mockReturnValue(chain);
    chain.from = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockResolvedValue(resolveValue);
    chain.innerJoin = vi.fn().mockReturnValue(chain);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.values = vi.fn().mockResolvedValue(undefined);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.set = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);
    return chain;
  }

  const dbMock = createChainableMock();

  // Stripe mock objects
  const mockCustomersCreate = vi.fn();
  const mockCheckoutSessionsCreate = vi.fn();
  const mockBillingPortalSessionsCreate = vi.fn();
  const mockSubscriptionsRetrieve = vi.fn();
  const mockWebhooksConstructEventAsync = vi.fn();

  const mockStripeInstance = {
    customers: { create: mockCustomersCreate },
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
    billingPortal: { sessions: { create: mockBillingPortalSessionsCreate } },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
    webhooks: { constructEventAsync: mockWebhooksConstructEventAsync },
  };

  const MockStripeConstructor = vi.fn(() => mockStripeInstance);

  return {
    db: dbMock,
    createChainableMock,
    mockStripeInstance,
    MockStripeConstructor,
    mockCustomersCreate,
    mockCheckoutSessionsCreate,
    mockBillingPortalSessionsCreate,
    mockSubscriptionsRetrieve,
    mockWebhooksConstructEventAsync,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("stripe", () => ({
  default: mocks.MockStripeConstructor,
}));

vi.mock("~/server/db", () => ({
  db: mocks.db,
}));

vi.mock("~/server/db/schema", () => ({
  users: {
    id: "id",
    stripeCustomerId: "stripe_customer_id",
    subscriptionStatus: "subscription_status",
    username: "username",
    email: "email",
  },
  subscriptionEvents: {
    id: "id",
    userId: "user_id",
    eventType: "event_type",
    stripeEventId: "stripe_event_id",
    data: "data",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => val),
}));

vi.mock("~/server/utils/cloudMode", () => ({
  isBillingEnabled: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("~/server/utils/tokens", () => ({
  generateId: vi.fn(() => "generated-event-id"),
}));

vi.mock("~/server/utils/email", () => ({
  isEmailConfigured: vi.fn().mockReturnValue(false),
  sendEmail: vi.fn().mockResolvedValue(false),
  getAppUrl: vi.fn().mockReturnValue("http://localhost:3000"),
}));

vi.mock("~/server/templates/email", () => ({
  supporterWelcomeEmail: vi.fn().mockReturnValue({
    subject: "Welcome",
    html: "<p>Welcome</p>",
    text: "Welcome",
  }),
  subscriptionRenewedEmail: vi.fn().mockReturnValue({
    subject: "Renewed",
    html: "<p>Renewed</p>",
    text: "Renewed",
  }),
  subscriptionCancelledEmail: vi.fn().mockReturnValue({
    subject: "Cancelled",
    html: "<p>Cancelled</p>",
    text: "Cancelled",
  }),
  paymentFailedEmail: vi.fn().mockReturnValue({
    subject: "Failed",
    html: "<p>Failed</p>",
    text: "Failed",
  }),
  paymentRecoveredEmail: vi.fn().mockReturnValue({
    subject: "Recovered",
    html: "<p>Recovered</p>",
    text: "Recovered",
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalEnv = { ...process.env };

function _setEnv(vars: Record<string, string | undefined>) {
  for (const [key, val] of Object.entries(vars)) {
    if (val === undefined) {
      process.env[key] = undefined;
    } else {
      process.env[key] = val;
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getStripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the cached stripeClient by re-importing — but since the module
    // caches `stripeClient` internally, we must reset the module between tests
    // that change env. For simplicity we use resetModules only where needed.
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns null when billing is not enabled", () => {
    vi.mocked(isBillingEnabled).mockReturnValue(false);
    const stripe = getStripe();
    expect(stripe).toBeNull();
  });

  it("returns null when STRIPE_SECRET_KEY is not set", async () => {
    vi.mocked(isBillingEnabled).mockReturnValue(true);
    process.env["STRIPE_SECRET_KEY"] = undefined;

    // Need fresh module to reset cached client
    vi.resetModules();
    const { getStripe: freshGetStripe } = await import("~/server/services/stripe");
    const stripe = freshGetStripe();
    expect(stripe).toBeNull();
  });

  it("returns a Stripe instance when configured", async () => {
    vi.mocked(isBillingEnabled).mockReturnValue(true);
    process.env["STRIPE_SECRET_KEY"] = "sk_test_fake";

    vi.resetModules();
    const { getStripe: freshGetStripe } = await import("~/server/services/stripe");
    const stripe = freshGetStripe();
    expect(stripe).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe("getOrCreateCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isBillingEnabled).mockReturnValue(true);
    process.env["STRIPE_SECRET_KEY"] = "sk_test_fake";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns null when stripe is not configured", async () => {
    vi.mocked(isBillingEnabled).mockReturnValue(false);
    const result = await getOrCreateCustomer("user-1", "a@b.com", "alice");
    expect(result).toBeNull();
  });

  it("returns existing customer ID if user already has one", async () => {
    mocks.db.limit.mockResolvedValueOnce([
      { stripeCustomerId: "cus_existing123" },
    ]);

    const result = await getOrCreateCustomer("user-1", "a@b.com", "alice");
    expect(result).toBe("cus_existing123");
    expect(mocks.mockCustomersCreate).not.toHaveBeenCalled();
  });

  it("creates a new customer when user has no stripeCustomerId", async () => {
    mocks.db.limit.mockResolvedValueOnce([{ stripeCustomerId: null }]);
    mocks.mockCustomersCreate.mockResolvedValueOnce({ id: "cus_new456" });

    const result = await getOrCreateCustomer("user-1", "a@b.com", "alice");

    expect(result).toBe("cus_new456");
    expect(mocks.mockCustomersCreate).toHaveBeenCalledWith({
      email: "a@b.com",
      name: "alice",
      metadata: { userId: "user-1", source: "tada" },
    });
    // Should update user record
    expect(mocks.db.update).toHaveBeenCalled();
    expect(mocks.db.set).toHaveBeenCalledWith(
      expect.objectContaining({ stripeCustomerId: "cus_new456" }),
    );
  });

  it("returns null and logs error when Stripe API throws", async () => {
    mocks.db.limit.mockResolvedValueOnce([{ stripeCustomerId: null }]);
    mocks.mockCustomersCreate.mockRejectedValueOnce(new Error("Stripe API error"));

    const result = await getOrCreateCustomer("user-1", "a@b.com", "alice");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe("createCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isBillingEnabled).mockReturnValue(true);
    process.env["STRIPE_SECRET_KEY"] = "sk_test_fake";
    process.env["STRIPE_PRICE_OAK"] = "price_oak_123";
    process.env["STRIPE_PRICE_SEEDLING"] = "price_seedling_1";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns error when billing is not configured", async () => {
    vi.mocked(isBillingEnabled).mockReturnValue(false);

    const result = await createCheckoutSession(
      "user-1", "a@b.com", "alice", "yearly", 12,
      "http://ok", "http://cancel",
    );
    expect(result).toEqual({ error: "Billing is not configured" });
  });

  it("returns error for non-yearly plan", async () => {
    const result = await createCheckoutSession(
      "user-1", "a@b.com", "alice", "monthly", 12,
      "http://ok", "http://cancel",
    );
    expect(result).toEqual({ error: "Only yearly subscriptions are supported" });
  });

  it("returns error when price ID is not configured for amount", async () => {
    const result = await createCheckoutSession(
      "user-1", "a@b.com", "alice", "yearly", 999,
      "http://ok", "http://cancel",
    );
    expect(result).toEqual(expect.objectContaining({ error: expect.stringContaining("Price ID not configured") }));
  });

  it("returns error when getOrCreateCustomer fails", async () => {
    // Make getOrCreateCustomer return null by having DB return no user
    // then Stripe create fails
    mocks.db.limit.mockResolvedValueOnce([{ stripeCustomerId: null }]);
    mocks.mockCustomersCreate.mockRejectedValueOnce(new Error("fail"));

    const result = await createCheckoutSession(
      "user-1", "a@b.com", "alice", "yearly", 12,
      "http://ok", "http://cancel",
    );
    expect(result).toEqual({ error: "Failed to create customer" });
  });

  it("returns checkout URL on success", async () => {
    // getOrCreateCustomer succeeds
    mocks.db.limit.mockResolvedValueOnce([{ stripeCustomerId: "cus_123" }]);

    mocks.mockCheckoutSessionsCreate.mockResolvedValueOnce({
      id: "cs_123",
      url: "https://checkout.stripe.com/session123",
    });

    const result = await createCheckoutSession(
      "user-1", "a@b.com", "alice", "yearly", 12,
      "http://ok", "http://cancel",
    );
    expect(result).toEqual({ url: "https://checkout.stripe.com/session123" });
    expect(mocks.mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
        mode: "subscription",
        line_items: [{ price: "price_oak_123", quantity: 1 }],
        success_url: "http://ok",
        cancel_url: "http://cancel",
      }),
    );
  });

  it("returns error when checkout session has no URL", async () => {
    mocks.db.limit.mockResolvedValueOnce([{ stripeCustomerId: "cus_123" }]);
    mocks.mockCheckoutSessionsCreate.mockResolvedValueOnce({
      id: "cs_123",
      url: null,
    });

    const result = await createCheckoutSession(
      "user-1", "a@b.com", "alice", "yearly", 12,
      "http://ok", "http://cancel",
    );
    expect(result).toEqual({ error: "Failed to create checkout session" });
  });

  it("returns error when Stripe API throws", async () => {
    mocks.db.limit.mockResolvedValueOnce([{ stripeCustomerId: "cus_123" }]);
    mocks.mockCheckoutSessionsCreate.mockRejectedValueOnce(new Error("Stripe error"));

    const result = await createCheckoutSession(
      "user-1", "a@b.com", "alice", "yearly", 12,
      "http://ok", "http://cancel",
    );
    expect(result).toEqual({ error: "Failed to create checkout session" });
  });
});

// ---------------------------------------------------------------------------

describe("createPortalSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isBillingEnabled).mockReturnValue(true);
    process.env["STRIPE_SECRET_KEY"] = "sk_test_fake";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns error when billing is not configured", async () => {
    vi.mocked(isBillingEnabled).mockReturnValue(false);
    const result = await createPortalSession("cus_123", "http://return");
    expect(result).toEqual({ error: "Billing is not configured" });
  });

  it("returns portal URL on success", async () => {
    mocks.mockBillingPortalSessionsCreate.mockResolvedValueOnce({
      url: "https://billing.stripe.com/portal123",
    });

    const result = await createPortalSession("cus_123", "http://return");
    expect(result).toEqual({ url: "https://billing.stripe.com/portal123" });
    expect(mocks.mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://return",
    });
  });

  it("returns error when Stripe API throws", async () => {
    mocks.mockBillingPortalSessionsCreate.mockRejectedValueOnce(
      new Error("Portal error"),
    );

    const result = await createPortalSession("cus_123", "http://return");
    expect(result).toEqual({ error: "Failed to create portal session" });
  });
});

// ---------------------------------------------------------------------------

describe("logSubscriptionEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts an event record into the database", async () => {
    await logSubscriptionEvent("user-1", "created", "evt_123", { plan: "oak" });

    expect(mocks.db.insert).toHaveBeenCalled();
    expect(mocks.db.values).toHaveBeenCalledWith({
      id: "generated-event-id",
      userId: "user-1",
      eventType: "created",
      stripeEventId: "evt_123",
      data: { plan: "oak" },
    });
  });

  it("handles missing optional params", async () => {
    await logSubscriptionEvent("user-1", "cancelled");

    expect(mocks.db.values).toHaveBeenCalledWith({
      id: "generated-event-id",
      userId: "user-1",
      eventType: "cancelled",
      stripeEventId: null,
      data: null,
    });
  });

  it("swallows DB errors gracefully", async () => {
    mocks.db.values.mockRejectedValueOnce(new Error("DB error"));

    // Should not throw
    await expect(
      logSubscriptionEvent("user-1", "created"),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

describe("handleWebhookEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isBillingEnabled).mockReturnValue(true);
    process.env["STRIPE_SECRET_KEY"] = "sk_test_fake";
    process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns failure when billing is not configured", async () => {
    vi.mocked(isBillingEnabled).mockReturnValue(false);
    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({
      success: false,
      message: "Billing is not configured",
    });
  });

  it("returns failure when webhook secret is not set", async () => {
    process.env["STRIPE_WEBHOOK_SECRET"] = undefined;
    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({
      success: false,
      message: "Webhook secret not configured",
    });
  });

  it("returns failure for invalid signature", async () => {
    mocks.mockWebhooksConstructEventAsync.mockRejectedValueOnce(
      new Error("Invalid signature"),
    );

    const result = await handleWebhookEvent("payload", "bad_sig");
    expect(result).toEqual({
      success: false,
      message: "Invalid signature",
    });
  });

  // -- checkout.session.completed --

  it("handles checkout.session.completed — upgrades user to premium", async () => {
    const fakeEvent = {
      id: "evt_checkout_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          customer: "cus_1",
          subscription: "sub_1",
          metadata: { userId: "user-1" },
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);

    // subscription retrieve
    mocks.mockSubscriptionsRetrieve.mockResolvedValueOnce({
      id: "sub_1",
      items: {
        data: [{ current_period_end: 1700000000, price: { id: "price_oak_123" } }],
      },
    });

    // logSubscriptionEvent DB insert
    mocks.db.values.mockResolvedValueOnce(undefined);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });

    // Should update user to premium
    expect(mocks.db.update).toHaveBeenCalled();
    expect(mocks.db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        stripeCustomerId: "cus_1",
      }),
    );
  });

  it("handles checkout.session.completed — missing userId silently returns", async () => {
    const fakeEvent = {
      id: "evt_checkout_2",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_2",
          customer: "cus_2",
          subscription: "sub_2",
          metadata: {},
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });
    // Should not attempt subscription retrieve
    expect(mocks.mockSubscriptionsRetrieve).not.toHaveBeenCalled();
  });

  // -- customer.subscription.updated --

  it("handles customer.subscription.updated — with userId in metadata", async () => {
    const fakeEvent = {
      id: "evt_sub_upd_1",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "active",
          customer: "cus_1",
          metadata: { userId: "user-1" },
          items: {
            data: [{ current_period_end: 1700000000 }],
          },
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    // logSubscriptionEvent insert
    mocks.db.values.mockResolvedValueOnce(undefined);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });

    expect(mocks.db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionTier: "premium",
        subscriptionStatus: "active",
      }),
    );
  });

  it("handles customer.subscription.updated — looks up user by customerId when no metadata", async () => {
    const fakeEvent = {
      id: "evt_sub_upd_2",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_2",
          status: "canceled",
          customer: "cus_2",
          metadata: {},
          items: { data: [{ current_period_end: 1700000000 }] },
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);

    // DB lookup by customerId returns a user
    mocks.db.limit.mockResolvedValueOnce([{ id: "user-2" }]);
    // logSubscriptionEvent insert
    mocks.db.values.mockResolvedValueOnce(undefined);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });

    // cancelled status maps to free tier
    expect(mocks.db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionTier: "free",
        subscriptionStatus: "cancelled",
      }),
    );
  });

  it("handles customer.subscription.updated — user not found by customerId", async () => {
    const fakeEvent = {
      id: "evt_sub_upd_3",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_3",
          status: "active",
          customer: "cus_unknown",
          metadata: {},
          items: { data: [{ current_period_end: 1700000000 }] },
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    // DB lookup returns no user
    mocks.db.limit.mockResolvedValueOnce([]);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });
    // Should not attempt to update subscription
    expect(mocks.db.set).not.toHaveBeenCalled();
  });

  // -- customer.subscription.deleted --

  it("handles customer.subscription.deleted — downgrades user to free", async () => {
    const fakeEvent = {
      id: "evt_sub_del_1",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          metadata: {},
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    // DB lookup by customerId
    mocks.db.limit.mockResolvedValueOnce([{ id: "user-1" }]);
    // logSubscriptionEvent insert
    mocks.db.values.mockResolvedValueOnce(undefined);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });

    expect(mocks.db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionTier: "free",
        subscriptionStatus: "cancelled",
        subscriptionExpiresAt: null,
      }),
    );
  });

  it("handles customer.subscription.deleted — user not found", async () => {
    const fakeEvent = {
      id: "evt_sub_del_2",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_2",
          customer: "cus_unknown",
          metadata: {},
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    mocks.db.limit.mockResolvedValueOnce([]);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });
    expect(mocks.db.set).not.toHaveBeenCalled();
  });

  // -- invoice.payment_failed --

  it("handles invoice.payment_failed — sets status to past_due", async () => {
    const fakeEvent = {
      id: "evt_inv_fail_1",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "inv_1",
          customer: "cus_1",
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    mocks.db.limit.mockResolvedValueOnce([{ id: "user-1" }]);
    mocks.db.values.mockResolvedValueOnce(undefined);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });

    expect(mocks.db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: "past_due",
      }),
    );
  });

  it("handles invoice.payment_failed — user not found does nothing", async () => {
    const fakeEvent = {
      id: "evt_inv_fail_2",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "inv_2",
          customer: "cus_unknown",
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    mocks.db.limit.mockResolvedValueOnce([]);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });
    expect(mocks.db.set).not.toHaveBeenCalled();
  });

  // -- invoice.paid --

  it("handles invoice.paid — recovers from past_due to active", async () => {
    const fakeEvent = {
      id: "evt_inv_paid_1",
      type: "invoice.paid",
      data: {
        object: {
          id: "inv_1",
          customer: "cus_1",
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    mocks.db.limit.mockResolvedValueOnce([
      { id: "user-1", subscriptionStatus: "past_due" },
    ]);
    mocks.db.values.mockResolvedValueOnce(undefined);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });

    expect(mocks.db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: "active",
      }),
    );
  });

  it("handles invoice.paid — does not update when already active", async () => {
    const fakeEvent = {
      id: "evt_inv_paid_2",
      type: "invoice.paid",
      data: {
        object: {
          id: "inv_2",
          customer: "cus_1",
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    mocks.db.limit.mockResolvedValueOnce([
      { id: "user-1", subscriptionStatus: "active" },
    ]);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });
    // Should NOT update user since not past_due
    expect(mocks.db.set).not.toHaveBeenCalled();
  });

  it("handles invoice.paid — user not found does nothing", async () => {
    const fakeEvent = {
      id: "evt_inv_paid_3",
      type: "invoice.paid",
      data: {
        object: { id: "inv_3", customer: "cus_unknown" },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    mocks.db.limit.mockResolvedValueOnce([]);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });
    expect(mocks.db.set).not.toHaveBeenCalled();
  });

  // -- unknown event type --

  it("handles unknown event type gracefully", async () => {
    const fakeEvent = {
      id: "evt_unknown_1",
      type: "some.unknown.event",
      data: { object: {} },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({ success: true, message: "Event processed" });
  });

  // -- error during event processing --

  it("returns failure when event handler throws", async () => {
    const fakeEvent = {
      id: "evt_err_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_err",
          customer: "cus_err",
          subscription: "sub_err",
          metadata: { userId: "user-err" },
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    mocks.mockSubscriptionsRetrieve.mockRejectedValueOnce(
      new Error("Stripe retrieve error"),
    );

    const result = await handleWebhookEvent("payload", "sig");
    expect(result).toEqual({
      success: false,
      message: "Error processing event",
    });
  });
});

// ---------------------------------------------------------------------------

describe("getSubscriptionPeriodEnd (via handleWebhookEvent)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isBillingEnabled).mockReturnValue(true);
    process.env["STRIPE_SECRET_KEY"] = "sk_test_fake";
    process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses items.data[0].current_period_end when available", async () => {
    const periodEndTimestamp = 1700000000;

    const fakeEvent = {
      id: "evt_period_1",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "active",
          customer: "cus_1",
          metadata: { userId: "user-1" },
          items: {
            data: [{ current_period_end: periodEndTimestamp }],
          },
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    mocks.db.values.mockResolvedValueOnce(undefined);

    await handleWebhookEvent("payload", "sig");

    const expectedIso = new Date(periodEndTimestamp * 1000).toISOString();
    expect(mocks.db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionExpiresAt: expectedIso,
      }),
    );
  });

  it("falls back to top-level current_period_end", async () => {
    const periodEndTimestamp = 1800000000;

    const fakeEvent = {
      id: "evt_period_2",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_2",
          status: "active",
          customer: "cus_2",
          metadata: { userId: "user-2" },
          items: { data: [{}] }, // no current_period_end in items
          current_period_end: periodEndTimestamp,
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    mocks.db.values.mockResolvedValueOnce(undefined);

    await handleWebhookEvent("payload", "sig");

    const expectedIso = new Date(periodEndTimestamp * 1000).toISOString();
    expect(mocks.db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionExpiresAt: expectedIso,
      }),
    );
  });

  it("falls back to 1 year from now when no period end is available", async () => {
    const fakeEvent = {
      id: "evt_period_3",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_3",
          status: "active",
          customer: "cus_3",
          metadata: { userId: "user-3" },
          items: { data: [{}] }, // no current_period_end anywhere
        },
      },
    };

    mocks.mockWebhooksConstructEventAsync.mockResolvedValueOnce(fakeEvent);
    mocks.db.values.mockResolvedValueOnce(undefined);

    const before = Date.now();
    await handleWebhookEvent("payload", "sig");
    const after = Date.now();

    // Verify the expiry is roughly 1 year from now
    const setCall = mocks.db.set.mock.calls[0]?.[0] as Record<string, unknown>;
    const expiresAt = new Date(setCall.subscriptionExpiresAt as string).getTime();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(before + oneYear - 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + oneYear + 1000);
  });
});
