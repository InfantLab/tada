<script setup lang="ts">
/**
 * Generic entry creation page.
 *
 * Looks up the entry type in the registry and renders its inputComponent.
 * Existing convenience routes (/tada, /sessions, /tally, /moments) still work.
 * This page enables /create/exercise, /create/tally, etc.
 */
import { getEntryTypeDefinition } from "~/registry/entryTypes";

definePageMeta({
  layout: "default",
});

const route = useRoute();
const typeName = computed(() => route.params.type as string);
const definition = computed(() => getEntryTypeDefinition(typeName.value));
const inputComponent = computed(() => {
  if (!definition.value) return null;
  return resolveComponent(definition.value.inputComponent);
});
</script>

<template>
  <div v-if="definition && inputComponent">
    <component :is="inputComponent" />
  </div>
  <div v-else class="text-center py-20">
    <div class="text-6xl mb-4">🤔</div>
    <h1 class="text-2xl font-bold text-stone-700 dark:text-stone-200 mb-2">
      Unknown entry type
    </h1>
    <p class="text-stone-500 dark:text-stone-400 mb-6">
      The entry type "{{ typeName }}" doesn't exist.
    </p>
    <NuxtLink
      to="/"
      class="text-tada-600 hover:underline"
    >
      ← Back to home
    </NuxtLink>
  </div>
</template>
