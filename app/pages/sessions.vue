<script setup lang="ts">
/**
 * Sessions page — Convenience route delegating to the timed module.
 *
 * All logic lives in modules/entry-types/timed/TimedInput.vue.
 * This page exists to preserve the /sessions URL.
 */
definePageMeta({
  layout: "default",
});
</script>

<template>
  <TimedInput />
</template>
