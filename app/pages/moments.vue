<script setup lang="ts">
/**
 * Moments page — Convenience route delegating to the moment module.
 *
 * All logic lives in modules/entry-types/moment/MomentInput.vue.
 * This page exists to preserve the /moments URL.
 */
definePageMeta({
  layout: "default",
});
</script>

<template>
  <MomentInput />
</template>
