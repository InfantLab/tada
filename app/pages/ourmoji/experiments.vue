<script setup lang="ts">
/**
 * /ourmoji/experiments — admin page for Ourmoji experiment runs (US4).
 */
import ExperimentRunManager from "~/components/ourmoji/ExperimentRunManager.vue";

definePageMeta({ layout: "default" });
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold">Ourmoji experiments</h1>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Manage dream telepathy experiment runs.
      </p>
    </header>
    <ExperimentRunManager />
  </div>
</template>
