<script setup lang="ts">
/**
 * Feature Hint
 *
 * A gentle, dismissible hint that appears contextually.
 * Philosophy: helpful whispers, not loud instructions.
 *
 * Props:
 * - message: The hint text to display
 * - icon: Optional emoji/icon
 * - position: Where to show (top, bottom)
 * - storageKey: localStorage key to remember dismissal
 */

const props = withDefaults(
  defineProps<{
    message: string;
    icon?: string;
    position?: "top" | "bottom";
    storageKey: string;
  }>(),
  {
    icon: "💡",
    position: "bottom",
  }
);

const isVisible = ref(false);
const isDismissed = ref(false);

// Check if already dismissed
onMounted(() => {
  const dismissed = localStorage.getItem(`tada-hint-${props.storageKey}`);
  if (dismissed) {
    isDismissed.value = true;
    return;
  }

  // Show with slight delay
  setTimeout(() => {
    isVisible.value = true;
  }, 500);
});

function dismiss() {
  isVisible.value = false;
  isDismissed.value = true;
  localStorage.setItem(`tada-hint-${props.storageKey}`, "true");
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="isVisible && !isDismissed"
      class="bg-tada-50 dark:bg-tada-900/30 border border-tada-200 dark:border-tada-800 rounded-xl p-4 flex items-start gap-3"
      :class="position === 'top' ? 'mb-4' : 'mt-4'"
    >
      <span class="text-xl flex-shrink-0">{{ icon }}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-tada-800 dark:text-tada-200">
          {{ message }}
        </p>
      </div>
      <button
        class="flex-shrink-0 text-tada-400 hover:text-tada-600 dark:text-tada-500 dark:hover:text-tada-300 p-1 -m-1"
        aria-label="Dismiss"
        @click="dismiss"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>
