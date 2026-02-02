/**
 * Subscription Management Composable
 *
 * Provides reactive state and methods for subscription management.
 * Handles both cloud mode and self-hosted scenarios.
 *
 * @see design/commercial.md for full architecture
 */

export interface SubscriptionStatus {
  cloudMode: boolean;
  tier: "free" | "premium" | "unlimited";
  status: "active" | "past_due" | "cancelled" | "expired";
  expiresAt: string | null;
  dataRetention: {
    from: string;
    to: string;
    retentionDays: number;
  };
  entries: {
    total: number;
    visible: number;
    archived: number;
  };
  retentionWarning: string | null;
  features: string[];
  email: string | null;
  emailVerified: boolean;
}

export interface BillingStatus {
  billingEnabled: boolean;
  cloudMode: boolean;
  tier: string;
  status?: string;
  isPremium?: boolean;
  canUpgrade: boolean;
  hasStripeAccount?: boolean;
  expiresAt?: string | null;
  pricing?: {
    monthly: { price: number; currency: string; interval: string };
    yearly: { price: number; currency: string; interval: string; savings: number };
  };
  email?: string | null;
  emailVerified?: boolean;
}

export function useSubscription() {
  const config = useRuntimeConfig();

  // Reactive state
  const subscription = ref<SubscriptionStatus | null>(null);
  const billing = ref<BillingStatus | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed properties - cast config to access public.isCloudMode
  const isCloudMode = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((config as any).public?.isCloudMode as boolean) ?? false;
  });
  const isPremium = computed(() =>
    subscription.value?.tier === "premium" ||
    subscription.value?.tier === "unlimited"
  );
  const isFree = computed(() => subscription.value?.tier === "free");
  const hasArchivedEntries = computed(() =>
    (subscription.value?.entries.archived ?? 0) > 0
  );
  const canUpgrade = computed(() => billing.value?.canUpgrade ?? false);

  /**
   * Load subscription status from API.
   */
  async function loadSubscription(): Promise<void> {
    if (!isCloudMode.value) {
      subscription.value = {
        cloudMode: false,
        tier: "unlimited",
        status: "active",
        expiresAt: null,
        dataRetention: {
          from: new Date(0).toISOString(),
          to: new Date().toISOString(),
          retentionDays: 0,
        },
        entries: { total: 0, visible: 0, archived: 0 },
        retentionWarning: null,
        features: ["unlimited_history", "all_features"],
        email: null,
        emailVerified: true,
      };
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      subscription.value = await $fetch<SubscriptionStatus>(
        "/api/subscription/status"
      );
    } catch (err) {
      console.error("Failed to load subscription status:", err);
      error.value = "Failed to load subscription status";
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Load billing status from API.
   */
  async function loadBilling(): Promise<void> {
    if (!isCloudMode.value) {
      billing.value = {
        billingEnabled: false,
        cloudMode: false,
        tier: "unlimited",
        canUpgrade: false,
      };
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      billing.value = await $fetch<BillingStatus>("/api/billing/status");
    } catch (err) {
      console.error("Failed to load billing status:", err);
      error.value = "Failed to load billing status";
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Load both subscription and billing status.
   */
  async function loadAll(): Promise<void> {
    await Promise.all([loadSubscription(), loadBilling()]);
  }

  /**
   * Create a Stripe Checkout session and redirect to it.
   */
  async function createCheckout(plan: "monthly" | "yearly"): Promise<void> {
    if (!billing.value?.canUpgrade) {
      error.value = "Cannot upgrade at this time";
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const result = await $fetch<{ url: string }>("/api/billing/create-checkout", {
        method: "POST",
        body: { plan },
      });

      // Redirect to Stripe Checkout
      window.location.href = result.url;
    } catch (err) {
      console.error("Failed to create checkout:", err);
      if (err && typeof err === "object" && "data" in err) {
        const errorData = err.data as { statusMessage?: string };
        error.value = errorData.statusMessage || "Failed to start checkout";
      } else {
        error.value = "Failed to start checkout";
      }
      isLoading.value = false;
    }
  }

  /**
   * Open the Stripe Customer Portal.
   */
  async function openPortal(): Promise<void> {
    if (!billing.value?.hasStripeAccount) {
      error.value = "No billing account found";
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const result = await $fetch<{ url: string }>("/api/billing/create-portal", {
        method: "POST",
      });

      // Redirect to Customer Portal
      window.location.href = result.url;
    } catch (err) {
      console.error("Failed to open portal:", err);
      if (err && typeof err === "object" && "data" in err) {
        const errorData = err.data as { statusMessage?: string };
        error.value = errorData.statusMessage || "Failed to open billing portal";
      } else {
        error.value = "Failed to open billing portal";
      }
      isLoading.value = false;
    }
  }

  /**
   * Send email verification.
   */
  async function sendVerification(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await $fetch<{ success: boolean; message: string }>(
        "/api/auth/send-verification",
        { method: "POST" }
      );
      return result;
    } catch (err) {
      console.error("Failed to send verification:", err);
      if (err && typeof err === "object" && "data" in err) {
        const errorData = err.data as { statusMessage?: string };
        return { success: false, message: errorData.statusMessage || "Failed to send verification" };
      }
      return { success: false, message: "Failed to send verification email" };
    }
  }

  return {
    // State
    subscription,
    billing,
    isLoading,
    error,

    // Computed
    isCloudMode,
    isPremium,
    isFree,
    hasArchivedEntries,
    canUpgrade,

    // Methods
    loadSubscription,
    loadBilling,
    loadAll,
    createCheckout,
    openPortal,
    sendVerification,
  };
}
