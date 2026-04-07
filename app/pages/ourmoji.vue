<script setup lang="ts">
/**
 * /ourmoji — Daily Ourmoji page (US1, T027).
 *
 * Hidden behind the per-user feature flag. The composable returns
 * `enabled.value === false` when the server responds 404 (module
 * disabled), at which point we render a friendly stub instead of the
 * card layout.
 */

import OurmojiDailyCard from "~/components/ourmoji/OurmojiDailyCard.vue";
import OurmojiCalendar from "~/components/ourmoji/OurmojiCalendar.vue";
import { useOurmoji } from "~/composables/useOurmoji";

definePageMeta({
  layout: "default",
});

const { today, history, loading, enabled, error, fetchCalendar } = useOurmoji();

onMounted(() => {
  void fetchCalendar();
});
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Ourmoji
      </h1>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        A daily emoji + reflection, with moon phase and Wheel-of-Year context.
      </p>
    </header>

    <div v-if="loading && enabled === null" class="text-sm text-gray-500">
      Loading…
    </div>

    <div
      v-else-if="enabled === false"
      class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      Ourmoji isn't enabled for your account yet.
    </div>

    <template v-else>
      <div v-if="error" class="text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </div>

      <OurmojiDailyCard :entry="today" />

      <OurmojiCalendar :entries="history" />
    </template>
  </div>
</template>
