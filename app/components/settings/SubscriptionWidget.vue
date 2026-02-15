<script setup lang="ts">
/**
 * SubscriptionWidget - Inline subscription status display for Settings
 *
 * Shows subscription tier, key benefits, and upgrade/manage options.
 * Designed to be compact but informative at the top of Settings.
 */

const {
  subscription,
  billing,
  isLoading,
  isCloudMode,
  isPremium,
  canUpgrade,
  loadAll,
  createCheckout,
  openPortal,
} = useSubscription();

// Load subscription data on mount
onMounted(async () => {
  await loadAll();
});

async function handleUpgrade() {
  await createCheckout("yearly");
}

async function handleManage() {
  await openPortal();
}

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
</script>

<template>
  <div
    class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4"
  >
    <!-- Loading State -->
    <div
      v-if="isLoading && !subscription"
      class="flex items-center gap-3 animate-pulse"
    >
      <div class="w-10 h-10 bg-stone-200 dark:bg-stone-700 rounded-full" />
      <div class="flex-1">
        <div class="h-4 bg-stone-200 dark:bg-stone-700 rounded w-24 mb-2" />
        <div class="h-3 bg-stone-200 dark:bg-stone-700 rounded w-32" />
      </div>
    </div>

    <!-- Self-Hosted Mode -->
    <div v-else-if="!isCloudMode" class="flex items-center gap-4">
      <div class="text-3xl">🏠</div>
      <div class="flex-1">
        <div class="font-semibold text-stone-800 dark:text-stone-100">
          Self-Hosted
        </div>
        <p class="text-sm text-stone-600 dark:text-stone-400">
          All features unlimited. Your data, your server.
        </p>
      </div>
    </div>

    <!-- Cloud Mode: Premium -->
    <div v-else-if="isPremium" class="flex items-start gap-4">
      <div class="text-3xl">🌳</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-semibold text-stone-800 dark:text-stone-100">
            Supporter
          </span>
          <span
            class="px-2 py-0.5 text-xs font-medium rounded-full bg-tada-100 dark:bg-tada-600/30 text-tada-700 dark:text-tada-200"
          >
            Active
          </span>
        </div>
        <div
          class="text-sm text-stone-600 dark:text-stone-400 mt-1 space-y-0.5"
        >
          <div class="flex items-center gap-1.5">
            <span class="text-green-500">✓</span>
            <span>Unlimited data history</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-green-500">✓</span>
            <span>Unlimited voice entries</span>
          </div>
        </div>
        <div class="flex items-center gap-3 mt-3">
          <button
            class="text-sm text-tada-600 dark:text-tada-400 hover:underline"
            :disabled="isLoading"
            @click="handleManage"
          >
            Manage Subscription
          </button>
          <span
            v-if="subscription?.expiresAt"
            class="text-xs text-stone-500 dark:text-stone-500"
          >
            Renews {{ formatDate(subscription.expiresAt) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Cloud Mode: Free -->
    <div v-else class="space-y-3">
      <div class="flex items-start gap-4">
        <div class="text-3xl">🆓</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-stone-800 dark:text-stone-100">
              Free Plan
            </span>
          </div>
          <div class="text-sm text-stone-600 dark:text-stone-400 mt-1">
            <div class="flex items-center gap-1.5">
              <span class="text-tada-600">•</span>
              <span
                >{{ subscription?.dataRetention?.retentionDays || 365 }} days
                data retention</span
              >
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-tada-600">•</span>
              <span>50 voice entries/month</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Archived entries notice -->
      <div
        v-if="
          subscription?.entries?.archived && subscription.entries.archived > 0
        "
        class="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm"
      >
        <span class="text-amber-600">⚠️</span>
        <span class="text-amber-800 dark:text-amber-200">
          {{ subscription.entries.archived }} entries archived. Upgrade to
          access.
        </span>
      </div>

      <!-- Upgrade CTA -->
      <div
        v-if="billing?.billingEnabled && canUpgrade"
        class="flex items-center justify-between gap-4 px-3 py-2 bg-gradient-to-r from-tada-50 to-amber-50 dark:from-tada-900/20 dark:to-amber-900/20 border border-tada-200 dark:border-tada-700 rounded-lg"
      >
        <div class="min-w-0">
          <div class="font-medium text-stone-800 dark:text-stone-100 text-sm">
            Become a Supporter 🌳
          </div>
          <div class="text-xs text-stone-600 dark:text-stone-400">
            Unlimited history · £12/year
          </div>
        </div>
        <button
          class="shrink-0 px-3 py-1.5 bg-tada-600 hover:bg-tada-700 text-white text-sm font-medium rounded-lg transition-colors"
          :disabled="isLoading"
          @click="handleUpgrade"
        >
          Upgrade
        </button>
      </div>

      <!-- Account details link -->
      <NuxtLink
        to="/account"
        :external="false"
        class="inline-flex items-center gap-1 text-sm text-tada-600 dark:text-tada-400 hover:underline font-medium cursor-pointer relative z-10"
      >
        View account details
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </NuxtLink>
    </div>
  </div>
</template>
