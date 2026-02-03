<script setup lang="ts">
/**
 * HelpLink - Subtle contextual help link
 *
 * A small, unobtrusive link to the help page that can be placed
 * on feature pages to provide contextual assistance.
 */

interface Props {
  /** Search query to pre-filter help page results */
  search?: string;
  /** Custom label (default: "Need help?") */
  label?: string;
  /** Whether to show as inline text or floating icon */
  variant?: "inline" | "icon";
}

const props = withDefaults(defineProps<Props>(), {
  search: "",
  label: "Need help?",
  variant: "inline",
});

const helpUrl = computed(() => {
  if (props.search) {
    return `/help?q=${encodeURIComponent(props.search)}`;
  }
  return "/help";
});
</script>

<template>
  <!-- Inline variant -->
  <NuxtLink
    v-if="variant === 'inline'"
    :to="helpUrl"
    class="inline-flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400 hover:text-tada-600 dark:hover:text-tada-400 transition-colors"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <span>{{ label }}</span>
  </NuxtLink>

  <!-- Icon variant (more subtle) -->
  <NuxtLink
    v-else
    :to="helpUrl"
    class="p-1 text-stone-400 hover:text-tada-600 dark:hover:text-tada-400 transition-colors"
    :title="label"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  </NuxtLink>
</template>
