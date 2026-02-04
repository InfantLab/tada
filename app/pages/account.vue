<script setup lang="ts">
import { useToast } from "~/composables/useToast";

definePageMeta({
  layout: "default",
  middleware: "auth",
});

const router = useRouter();
const route = useRoute();
const { showSuccess, showError } = useToast();

const {
  subscription,
  billing,
  isLoading,
  error,
  isCloudMode,
  isPremium,
  canUpgrade,
  loadAll,
  createCheckout,
  openPortal,
  sendVerification,
} = useSubscription();

// Check for success/cancel query params from Stripe redirect
const checkoutSuccess = computed(() => route.query["success"] === "true");
const checkoutCanceled = computed(() => route.query["canceled"] === "true");

// Email verification state
const isSendingVerification = ref(false);
const verificationSent = ref(false);

// Delete account state
const showDeleteDialog = ref(false);
const deleteConfirmation = ref("");
const isDeleting = ref(false);

// Load data on mount
onMounted(async () => {
  await loadAll();

  if (checkoutSuccess.value) {
    showSuccess("Subscription activated! Welcome to Premium.");
    // Clear query params
    router.replace({ query: {} });
  } else if (checkoutCanceled.value) {
    showError("Checkout was canceled");
    router.replace({ query: {} });
  }
});

async function handleSendVerification() {
  isSendingVerification.value = true;
  const result = await sendVerification();
  isSendingVerification.value = false;

  if (result.success) {
    verificationSent.value = true;
    showSuccess("Verification email sent! Check your inbox.");
  } else {
    showError(result.message);
  }
}

async function handleUpgrade(plan: "monthly" | "yearly") {
  await createCheckout(plan);
}

async function handleManageSubscription() {
  await openPortal();
}

async function handleDeleteAccount() {
  if (deleteConfirmation.value !== "DELETE") {
    showError("Please type DELETE to confirm");
    return;
  }

  isDeleting.value = true;

  try {
    const response = await $fetch("/api/account", {
      method: "DELETE",
      body: { confirmation: "DELETE" },
    });

    if (response.success) {
      // Redirect to home page after deletion
      showSuccess("Your account has been deleted. Goodbye!");
      router.push("/");
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to delete account";
    showError(errorMessage);
  } finally {
    isDeleting.value = false;
    showDeleteDialog.value = false;
    deleteConfirmation.value = "";
  }
}

function openDeleteDialog() {
  deleteConfirmation.value = "";
  showDeleteDialog.value = true;
}

function closeDeleteDialog() {
  showDeleteDialog.value = false;
  deleteConfirmation.value = "";
}

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-8">
      <NuxtLink
        to="/settings"
        class="p-2 -ml-2 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </NuxtLink>
      <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
        Account
      </h1>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !subscription" class="text-center py-12">
      <div class="animate-pulse text-4xl mb-4">⏳</div>
      <p class="text-stone-600 dark:text-stone-400">Loading account info...</p>
    </div>

    <!-- Not Cloud Mode -->
    <div
      v-else-if="!isCloudMode"
      class="space-y-6"
    >
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
        <div class="text-center">
          <div class="text-4xl mb-4">🏠</div>
          <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">
            Self-Hosted Mode
          </h2>
          <p class="text-stone-600 dark:text-stone-400">
            You're running Ta-Da! on your own server. All features are unlimited!
          </p>
        </div>
      </div>

      <!-- Danger Zone (self-hosted) -->
      <div
        class="bg-white dark:bg-stone-800 rounded-xl border border-red-200 dark:border-red-900 p-6"
      >
        <h2 class="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
          Danger Zone
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          @click="openDeleteDialog"
        >
          Delete Account
        </button>
      </div>
    </div>

    <!-- Cloud Mode Account -->
    <div v-else class="space-y-6">
      <!-- Subscription Status Card -->
      <div
        class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100">
              Subscription
            </h2>
            <p class="text-sm text-stone-600 dark:text-stone-400">
              Your current plan and benefits
            </p>
          </div>
          <span
            class="px-3 py-1 rounded-full text-sm font-medium"
            :class="
              isPremium
                ? 'bg-tada-100 dark:bg-tada-600/30 text-tada-800 dark:text-tada-200'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
            "
          >
            {{ isPremium ? "Premium" : "Free" }}
          </span>
        </div>

        <!-- Premium Status -->
        <div v-if="isPremium" class="space-y-4">
          <div class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <span class="text-green-500">✓</span>
            <span>Unlimited data history</span>
          </div>
          <div class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <span class="text-green-500">✓</span>
            <span>All features included</span>
          </div>
          <div class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <span class="text-green-500">✓</span>
            <span>Email support</span>
          </div>

          <div v-if="subscription?.expiresAt" class="pt-4 border-t border-stone-200 dark:border-stone-700">
            <p class="text-sm text-stone-600 dark:text-stone-400">
              Next billing date: {{ formatDate(subscription.expiresAt) }}
            </p>
          </div>

          <button
            class="w-full mt-4 px-4 py-2 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
            :disabled="isLoading"
            @click="handleManageSubscription"
          >
            Manage Subscription
          </button>
        </div>

        <!-- Free Status -->
        <div v-else class="space-y-4">
          <div class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <span class="text-tada-600">•</span>
            <span>{{ subscription?.dataRetention.retentionDays || 365 }} days data retention</span>
          </div>
          <div class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <span class="text-tada-600">•</span>
            <span>All core features</span>
          </div>
          <div class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
            <span class="text-tada-600">•</span>
            <span>Community support</span>
          </div>

          <!-- Archived entries notice -->
          <div
            v-if="subscription?.entries.archived && subscription.entries.archived > 0"
            class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg"
          >
            <p class="text-sm text-amber-800 dark:text-amber-200">
              <span class="font-medium">{{ subscription.entries.archived }}</span>
              entries are archived. Upgrade to access your full history.
            </p>
          </div>
        </div>
      </div>

      <!-- Upgrade Card (if free) -->
      <div
        v-if="!isPremium && billing?.billingEnabled"
        class="bg-gradient-to-br from-tada-50 to-amber-50 dark:from-tada-900/20 dark:to-amber-900/20 rounded-xl border border-tada-200 dark:border-tada-700 p-6"
      >
        <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-2">
          Support Ta-Da! 🌳
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          Ta-Da! is a hobby project, not a professional service. Pay what feels right to help keep the servers running.
        </p>

        <!-- Email verification required -->
        <div
          v-if="!subscription?.emailVerified"
          class="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg mb-4"
        >
          <p class="text-sm text-amber-800 dark:text-amber-200">
            Please verify your email to become a supporter.
          </p>
        </div>

        <div class="text-center mb-4">
          <div class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-1">
            £12<span class="text-lg text-stone-500 dark:text-stone-400">/year</span>
          </div>
          <p class="text-sm text-stone-500 dark:text-stone-400">
            Suggested — or pay what you want (min £1/year)
          </p>
        </div>

        <button
          class="w-full px-6 py-3 bg-tada-600 hover:bg-tada-700 text-white rounded-lg font-medium transition-colors"
          :disabled="!canUpgrade || isLoading"
          :class="{ 'opacity-50 cursor-not-allowed': !canUpgrade }"
          @click="handleUpgrade('yearly')"
        >
          Become a Supporter
        </button>

        <p class="text-xs text-center text-stone-500 dark:text-stone-400 mt-3">
          All supporters get the same features — unlimited data history forever
        </p>
      </div>

      <!-- Email Verification Card -->
      <div
        v-if="!subscription?.emailVerified && subscription?.email"
        class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100">
              Email Verification
            </h2>
            <p class="text-sm text-stone-600 dark:text-stone-400">
              {{ subscription.email }}
            </p>
          </div>
          <span
            class="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
          >
            Unverified
          </span>
        </div>

        <p class="text-stone-600 dark:text-stone-400 mb-4">
          Please verify your email to unlock all features and ensure you can recover your account.
        </p>

        <button
          v-if="!verificationSent"
          class="px-4 py-2 bg-tada-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          :disabled="isSendingVerification"
          @click="handleSendVerification"
        >
          {{ isSendingVerification ? "Sending..." : "Send Verification Email" }}
        </button>
        <p v-else class="text-green-600 dark:text-green-400">
          ✓ Verification email sent! Check your inbox.
        </p>
      </div>

      <!-- Data Usage Card -->
      <div
        class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6"
      >
        <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Data Usage
        </h2>

        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-stone-600 dark:text-stone-400">Total entries</span>
            <span class="font-medium text-stone-800 dark:text-stone-100">
              {{ subscription?.entries.total || 0 }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-stone-600 dark:text-stone-400">Visible entries</span>
            <span class="font-medium text-stone-800 dark:text-stone-100">
              {{ subscription?.entries.visible || 0 }}
            </span>
          </div>
          <div
            v-if="subscription?.entries.archived && subscription.entries.archived > 0"
            class="flex justify-between"
          >
            <span class="text-stone-600 dark:text-stone-400">Archived entries</span>
            <span class="font-medium text-amber-600 dark:text-amber-400">
              {{ subscription.entries.archived }}
            </span>
          </div>
        </div>

        <!-- Retention warning -->
        <div
          v-if="subscription?.retentionWarning"
          class="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
        >
          <p class="text-sm text-amber-800 dark:text-amber-200">
            {{ subscription.retentionWarning }}
          </p>
        </div>
      </div>

      <!-- Export Data Link -->
      <div
        class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6"
      >
        <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-2">
          Your Data
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          Export all your data at any time. This includes all entries, even archived ones.
        </p>
        <NuxtLink
          to="/settings#section-data"
          class="inline-flex items-center gap-2 text-tada-600 dark:text-tada-400 hover:underline"
        >
          Go to Data Export
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </NuxtLink>
      </div>

      <!-- Error Display -->
      <div
        v-if="error"
        class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg"
      >
        <p class="text-red-800 dark:text-red-200">{{ error }}</p>
      </div>

      <!-- Danger Zone -->
      <div
        class="bg-white dark:bg-stone-800 rounded-xl border border-red-200 dark:border-red-900 p-6"
      >
        <h2 class="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
          Danger Zone
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          @click="openDeleteDialog"
        >
          Delete Account
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Dialog (outside conditional to work for both modes) -->
    <Teleport to="body">
      <div
        v-if="showDeleteDialog"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50"
          @click="closeDeleteDialog"
        />

        <!-- Dialog -->
        <div
          class="relative bg-white dark:bg-stone-800 rounded-xl shadow-xl max-w-md w-full p-6"
        >
          <h3 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">
            Delete Your Account?
          </h3>

          <div class="space-y-4">
            <p class="text-stone-600 dark:text-stone-400">
              This will permanently delete:
            </p>
            <ul class="text-stone-600 dark:text-stone-400 text-sm space-y-1 ml-4">
              <li>All your entries and activity history</li>
              <li>All your rhythms and streaks</li>
              <li>All your preferences and settings</li>
              <li v-if="isPremium">Your premium subscription (will be cancelled)</li>
            </ul>

            <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p class="text-sm text-red-800 dark:text-red-200 font-medium">
                This action cannot be undone. All your data will be permanently removed.
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Type <span class="font-mono bg-stone-100 dark:bg-stone-700 px-1 rounded">DELETE</span> to confirm
              </label>
              <input
                v-model="deleteConfirmation"
                type="text"
                placeholder="DELETE"
                class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                @keyup.enter="handleDeleteAccount"
              />
            </div>

            <div class="flex gap-3 pt-2">
              <button
                class="flex-1 px-4 py-2 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                :disabled="isDeleting"
                @click="closeDeleteDialog"
              >
                Cancel
              </button>
              <button
                class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="deleteConfirmation !== 'DELETE' || isDeleting"
                @click="handleDeleteAccount"
              >
                {{ isDeleting ? "Deleting..." : "Delete Account" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
