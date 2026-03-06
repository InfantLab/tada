<script setup lang="ts">
/**
 * Ta-Da page — Convenience route delegating to the tada module.
 *
 * All logic lives in modules/entry-types/tada/TadaInput.vue.
 * This page exists to preserve the /tada URL.
 */
definePageMeta({
  layout: "default",
});
</script>

<template>
  <TadaInput />
</template>
