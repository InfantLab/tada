<script setup lang="ts">
/**
 * NewsletterSignup - Email subscription form
 *
 * A friendly, minimal signup form for the newsletter.
 * Used on blog page and landing page.
 */

const props = withDefaults(
  defineProps<{
    source?: string;
    compact?: boolean;
  }>(),
  {
    source: "blog",
    compact: false,
  }
);

const email = ref("");
const status = ref<"idle" | "loading" | "success" | "error">("idle");
const message = ref("");

async function subscribe() {
  if (!email.value.trim()) return;

  status.value = "loading";
  message.value = "";

  try {
    const response = await $fetch<{
      success: boolean;
      message: string;
      alreadySubscribed?: boolean;
      resubscribed?: boolean;
    }>("/api/newsletter/subscribe", {
      method: "POST",
      body: {
        email: email.value,
        source: props.source,
      },
    });

    status.value = "success";
    message.value = response.message;
    email.value = "";
  } catch (error: unknown) {
    status.value = "error";
    const fetchError = error as { data?: { message?: string } };
    message.value = fetchError?.data?.message || "Something went wrong. Please try again.";
  }
}
</script>

<template>
  <div
    class="rounded-xl"
    :class="compact ? 'p-4' : 'p-6 bg-pearl-mist dark:bg-cosmic-indigo'"
  >
    <!-- Success state -->
    <div v-if="status === 'success'" class="text-center">
      <div class="text-3xl mb-2">💌</div>
      <p class="text-stone-700 dark:text-stone-200 font-medium">
        {{ message }}
      </p>
      <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
        You'll hear from us when we publish something new.
      </p>
    </div>

    <!-- Form state -->
    <template v-else>
      <div v-if="!compact" class="text-center mb-4">
        <h3 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-1">
          Stay in the loop
        </h3>
        <p class="text-sm text-stone-600 dark:text-stone-400">
          Occasional thoughts on mindfulness, habits, and gentle progress.
        </p>
      </div>

      <form class="flex gap-2" :class="compact ? '' : 'max-w-md mx-auto'" @submit.prevent="subscribe">
        <input
          v-model="email"
          type="email"
          placeholder="your@email.com"
          required
          :disabled="status === 'loading'"
          class="flex-1 px-4 py-2.5 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-tada-500 focus:border-transparent disabled:opacity-50 text-sm"
        />
        <button
          type="submit"
          :disabled="status === 'loading' || !email.trim()"
          class="px-5 py-2.5 bg-tada-600 text-white rounded-lg font-medium hover:bg-tada-700 focus:outline-none focus:ring-2 focus:ring-tada-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
        >
          <span v-if="status === 'loading'">...</span>
          <span v-else>Subscribe</span>
        </button>
      </form>

      <!-- Error message -->
      <p v-if="status === 'error'" class="text-sm text-red-600 dark:text-red-400 mt-2 text-center">
        {{ message }}
      </p>

      <!-- Privacy note -->
      <p v-if="!compact" class="text-xs text-stone-500 dark:text-stone-500 mt-3 text-center">
        No spam, unsubscribe anytime.
        <NuxtLink to="/privacy" class="underline hover:text-tada-600 dark:hover:text-tada-400">
          Privacy Policy
        </NuxtLink>
      </p>
    </template>
  </div>
</template>
