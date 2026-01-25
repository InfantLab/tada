<script setup lang="ts">
/**
 * ConflictWarning - Display entry overlap/conflict warnings
 *
 * Features:
 * - Shows overlapping entries with time ranges
 * - Provides resolution options (replace, keep both, cancel)
 * - Visual indicator of conflict severity
 *
 * Used in QuickEntryModal to warn about time overlaps
 */
import type { ConflictResult } from "~/utils/entrySchemas";

const props = defineProps<{
  /** Conflict detection result */
  conflict: ConflictResult;
  /** Whether the modal is loading */
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: "resolve", action: "allow-both" | "replace" | "cancel"): void;
}>();

// Format duration for display
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

// Format time for display
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Get severity class based on resolution suggestion
const severityClass = computed(() => {
  switch (props.conflict.suggestedResolution) {
    case "block":
      return "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20";
    case "warn":
      return "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20";
    default:
      return "border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-800";
  }
});

const iconClass = computed(() => {
  switch (props.conflict.suggestedResolution) {
    case "block":
      return "text-red-500 dark:text-red-400";
    case "warn":
      return "text-amber-500 dark:text-amber-400";
    default:
      return "text-stone-400";
  }
});
</script>

<template>
  <div
    v-if="conflict.hasConflict && conflict.overlappingEntries.length > 0"
    class="rounded-lg border p-3 space-y-3"
    :class="severityClass"
  >
    <!-- Header -->
    <div class="flex items-start gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 flex-shrink-0 mt-0.5"
        :class="iconClass"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div class="flex-1">
        <h4 class="font-medium text-stone-900 dark:text-white text-sm">
          Time Conflict Detected
        </h4>
        <p class="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
          This entry overlaps with {{ conflict.overlappingEntries.length }}
          existing {{ conflict.overlappingEntries.length === 1 ? "entry" : "entries" }}
        </p>
      </div>
    </div>

    <!-- Overlapping entries list -->
    <div class="space-y-1.5">
      <div
        v-for="entry in conflict.overlappingEntries"
        :key="entry.id"
        class="flex items-center justify-between text-sm bg-white dark:bg-stone-800 rounded px-2 py-1.5"
      >
        <div class="flex items-center gap-2">
          <span v-if="entry.emoji" class="text-base">{{ entry.emoji }}</span>
          <span class="text-stone-900 dark:text-white">{{ entry.name }}</span>
        </div>
        <div class="text-xs text-stone-500 dark:text-stone-400">
          {{ formatTime(entry.timestamp) }}
          <span v-if="entry.durationSeconds">
            ({{ formatDuration(entry.durationSeconds) }})
          </span>
        </div>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-2 pt-1">
      <button
        type="button"
        :disabled="isLoading"
        class="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-600 disabled:opacity-50 transition-colors"
        @click="emit('resolve', 'allow-both')"
      >
        Keep Both
      </button>
      <button
        type="button"
        :disabled="isLoading"
        class="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50 transition-colors"
        @click="emit('resolve', 'replace')"
      >
        Replace
      </button>
      <button
        type="button"
        :disabled="isLoading"
        class="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-stone-200 dark:bg-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-500 disabled:opacity-50 transition-colors"
        @click="emit('resolve', 'cancel')"
      >
        Cancel
      </button>
    </div>
  </div>
</template>
