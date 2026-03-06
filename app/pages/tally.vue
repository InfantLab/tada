<script setup lang="ts">
/**
 * Tally page — Convenience route delegating to the tally module.
 *
 * All logic lives in modules/entry-types/tally/TallyInput.vue.
 * This page exists to preserve the /tally URL.
 */
definePageMeta({
  layout: "default",
});
</script>

<template>
  <TallyInput />
</template>
