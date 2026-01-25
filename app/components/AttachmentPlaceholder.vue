<script setup lang="ts">
/**
 * AttachmentPlaceholder - Coming soon UI for attachments
 *
 * Shows a disabled attachment button with "coming soon" indicator.
 * Placeholder for future attachment functionality.
 */

defineProps<{
  /** Compact mode for inline use */
  compact?: boolean;
}>();

const showTooltip = ref(false);
</script>

<template>
  <div
    class="relative"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <!-- Attachment button (disabled) -->
    <button
      type="button"
      disabled
      class="flex items-center gap-2 transition-colors cursor-not-allowed opacity-60"
      :class="compact
        ? 'px-2 py-1 text-xs rounded-md bg-stone-100 dark:bg-stone-700 text-stone-400 dark:text-stone-500'
        : 'px-3 py-2 text-sm rounded-lg border border-dashed border-stone-300 dark:border-stone-600 text-stone-400 dark:text-stone-500 hover:border-stone-400 dark:hover:border-stone-500'"
    >
      <!-- Paperclip icon -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        :class="compact ? 'h-3.5 w-3.5' : 'h-4 w-4'"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
        />
      </svg>
      <span v-if="!compact">Attach</span>
    </button>

    <!-- Coming soon tooltip -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showTooltip"
        class="absolute z-10 px-2 py-1 text-xs font-medium text-white bg-stone-800 dark:bg-stone-600 rounded shadow-lg whitespace-nowrap"
        :class="compact ? 'bottom-full left-1/2 -translate-x-1/2 mb-1' : 'top-full left-0 mt-1'"
      >
        Coming soon!
        <!-- Arrow -->
        <div
          class="absolute w-2 h-2 bg-stone-800 dark:bg-stone-600 transform rotate-45"
          :class="compact ? 'top-full left-1/2 -translate-x-1/2 -mt-1' : 'bottom-full left-4 mb-0.5'"
        />
      </div>
    </Transition>
  </div>
</template>
