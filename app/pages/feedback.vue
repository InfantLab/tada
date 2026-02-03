<script setup lang="ts">
/**
 * Feedback / Bug Report Page
 *
 * Zen-like interface for reporting issues and sending feedback.
 * Shows exactly what data will be included before sending.
 */

import { useToast } from "~/composables/useToast";

definePageMeta({
  layout: "default",
  auth: false, // Allow public access
});

useSeoMeta({
  title: "Send Feedback - Ta-Da!",
  description: "Report issues or send feedback about Ta-Da!",
});

const config = useRuntimeConfig();
const { showSuccess, showError } = useToast();

// Form state
const feedbackType = ref<"bug" | "feedback" | "question">("feedback");
const description = ref("");
const expectedBehavior = ref("");
const email = ref("");
const includeSystemInfo = ref(true);
const isSubmitting = ref(false);
const submitted = ref(false);

// System info (collected on client)
const systemInfo = ref({
  userAgent: "",
  platform: "",
  language: "",
  screenSize: "",
  appVersion: "",
  timestamp: "",
});

onMounted(() => {
  systemInfo.value = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    appVersion: (config.public as { appVersion?: string }).appVersion || "unknown",
    timestamp: new Date().toISOString(),
  };
});

const canSubmit = computed(() => {
  return description.value.trim().length >= 10;
});

const charsNeeded = computed(() => {
  return Math.max(0, 10 - description.value.length);
});

async function submitFeedback() {
  if (!canSubmit.value || isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    await $fetch("/api/feedback", {
      method: "POST",
      body: {
        type: feedbackType.value,
        description: description.value,
        expectedBehavior: feedbackType.value === "bug" ? expectedBehavior.value : undefined,
        email: email.value || undefined,
        systemInfo: includeSystemInfo.value ? systemInfo.value : undefined,
      },
    });

    submitted.value = true;
    showSuccess("Thank you! Your feedback has been received.");
  } catch (err) {
    console.error("Failed to submit feedback:", err);
    showError("Failed to send feedback. Please try again.");
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm() {
  submitted.value = false;
  description.value = "";
  expectedBehavior.value = "";
  feedbackType.value = "feedback";
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <NuxtLink
        to="/help"
        class="inline-flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors mb-4"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Help
      </NuxtLink>
      <h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-2">
        Send Feedback
      </h1>
      <p class="text-stone-600 dark:text-stone-400">
        Something not quite right? We'd love to hear from you.
      </p>
    </div>

    <!-- Success State -->
    <div
      v-if="submitted"
      class="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-8 text-center"
    >
      <div class="text-5xl mb-4">💚</div>
      <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">
        Thank you!
      </h2>
      <p class="text-stone-600 dark:text-stone-400 mb-6">
        We've received your feedback and truly appreciate you taking the time
        to help make Ta-Da! better.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          class="px-6 py-3 bg-tada-600 text-white rounded-xl font-medium hover:bg-tada-700 transition-colors"
          @click="resetForm"
        >
          Send More Feedback
        </button>
        <NuxtLink
          to="/"
          class="px-6 py-3 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl font-medium hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
        >
          Back to Ta-Da!
        </NuxtLink>
      </div>
    </div>

    <!-- Feedback Form -->
    <form v-else class="space-y-6" @submit.prevent="submitFeedback">
      <!-- Feedback Type -->
      <div>
        <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
          What kind of feedback?
        </label>
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border transition-colors"
            :class="
              feedbackType === 'bug'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
            "
            @click="feedbackType = 'bug'"
          >
            🐛 Bug Report
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg border transition-colors"
            :class="
              feedbackType === 'feedback'
                ? 'bg-tada-50 dark:bg-tada-900/20 border-tada-300 dark:border-tada-700 text-tada-700 dark:text-tada-300'
                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
            "
            @click="feedbackType = 'feedback'"
          >
            💡 Suggestion
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg border transition-colors"
            :class="
              feedbackType === 'question'
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
            "
            @click="feedbackType = 'question'"
          >
            ❓ Question
          </button>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label
          for="description"
          class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
        >
          {{ feedbackType === "bug" ? "What happened?" : "Tell us more" }}
        </label>
        <textarea
          id="description"
          v-model="description"
          rows="4"
          placeholder="Please describe in as much detail as you can..."
          class="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-tada-500 resize-none"
        />
        <p class="mt-1 text-xs text-stone-500">
          <template v-if="charsNeeded > 0">{{ charsNeeded }} more characters needed</template>
          <template v-else>✓ Ready to send</template>
        </p>
      </div>

      <!-- Expected Behavior (for bugs) -->
      <div v-if="feedbackType === 'bug'">
        <label
          for="expected"
          class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
        >
          What did you expect to happen?
        </label>
        <textarea
          id="expected"
          v-model="expectedBehavior"
          rows="2"
          placeholder="Optional: describe what you expected..."
          class="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-tada-500 resize-none"
        />
      </div>

      <!-- Email -->
      <div>
        <label
          for="email"
          class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
        >
          Email (optional)
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="your@email.com"
          class="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-tada-500"
        />
        <p class="mt-1 text-xs text-stone-500">
          If you'd like us to follow up with you
        </p>
      </div>

      <!-- System Info Toggle -->
      <div
        class="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-4 border border-stone-200 dark:border-stone-700"
      >
        <label class="flex items-start gap-3 cursor-pointer">
          <input
            v-model="includeSystemInfo"
            type="checkbox"
            class="mt-1 w-4 h-4 rounded border-stone-300 text-tada-600 focus:ring-tada-500"
          />
          <div>
            <span class="font-medium text-stone-800 dark:text-stone-100">
              Include system information
            </span>
            <p class="text-sm text-stone-600 dark:text-stone-400 mt-1">
              Helps us diagnose issues faster
            </p>
          </div>
        </label>

        <!-- System info preview -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-48"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-48"
          leave-to-class="opacity-0 max-h-0"
        >
          <div
            v-if="includeSystemInfo"
            class="mt-4 p-3 bg-white dark:bg-stone-800 rounded-lg text-xs font-mono text-stone-600 dark:text-stone-400 overflow-hidden"
          >
            <div>Browser: {{ systemInfo.userAgent.substring(0, 50) }}...</div>
            <div>Platform: {{ systemInfo.platform }}</div>
            <div>Screen: {{ systemInfo.screenSize }}</div>
            <div>Version: {{ systemInfo.appVersion }}</div>
          </div>
        </Transition>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="!canSubmit || isSubmitting"
        class="w-full px-6 py-3 bg-tada-600 text-white rounded-xl font-semibold hover:bg-tada-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="isSubmitting">Sending...</span>
        <span v-else>Send Feedback</span>
      </button>
    </form>

    <!-- Privacy note -->
    <p class="mt-6 text-center text-sm text-stone-500 dark:text-stone-500">
      Your feedback is private and used only to improve Ta-Da!
      <NuxtLink to="/privacy" class="underline hover:text-tada-600">
        Privacy Policy
      </NuxtLink>
    </p>
  </div>
</template>
