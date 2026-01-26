<script setup lang="ts">
/**
 * EntryTypeToggle - Toggle between entry modes (timed/count/moment)
 *
 * Features:
 * - Visual toggle between entry types
 * - Icon + label for each mode
 * - Animated selection indicator
 *
 * Used in QuickEntryModal to switch between entry modes
 */

export type EntryMode = "timed" | "tally" | "moment";

const props = withDefaults(
  defineProps<{
    /** Current selected mode */
    modelValue: EntryMode;
    /** Available modes to show (hide modes not needed) */
    availableModes?: EntryMode[];
    /** Compact mode (icons only) */
    compact?: boolean;
    /** Disable all interactions */
    disabled?: boolean;
  }>(),
  {
    availableModes: () => ["timed", "tally", "moment"],
    compact: false,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: EntryMode): void;
}>();

// Mode definitions with icons and labels
interface ModeDefinition {
  id: EntryMode;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

const modes: ModeDefinition[] = [
  {
    id: "timed",
    label: "Timed",
    shortLabel: "Time",
    icon: "⏱️",
    description: "Log a duration-based activity",
  },
  {
    id: "tally",
    label: "Tally",
    shortLabel: "Count",
    icon: "🔢",
    description: "Log a count-based activity",
  },
  {
    id: "moment",
    label: "Moment",
    shortLabel: "Note",
    icon: "✨",
    description: "Capture a quick thought or event",
  },
];

// Filter to only show available modes
const visibleModes = computed(() => {
  return modes.filter((mode) => props.availableModes.includes(mode.id));
});

// Select a mode
function selectMode(mode: EntryMode) {
  if (!props.disabled && props.availableModes.includes(mode)) {
    emit("update:modelValue", mode);
  }
}

// Check if mode is selected
function isSelected(mode: EntryMode): boolean {
  return props.modelValue === mode;
}
</script>

<template>
  <div
    class="inline-flex rounded-lg p-1 bg-stone-100 dark:bg-stone-800"
    role="radiogroup"
    :aria-label="compact ? 'Entry type' : 'Select entry type'"
  >
    <button
      v-for="mode in visibleModes"
      :key="mode.id"
      type="button"
      role="radio"
      :aria-checked="isSelected(mode.id)"
      :disabled="disabled"
      :title="mode.description"
      class="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      :class="
        isSelected(mode.id)
          ? 'bg-white dark:bg-stone-700 text-tada-700 dark:text-tada-300 shadow-sm'
          : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
      "
      @click="selectMode(mode.id)"
    >
      <!-- Icon -->
      <span class="text-base" aria-hidden="true">{{ mode.icon }}</span>

      <!-- Label (hidden in compact mode) -->
      <span v-if="!compact" class="hidden sm:inline">
        {{ mode.label }}
      </span>
      <span v-if="!compact" class="sm:hidden">
        {{ mode.shortLabel }}
      </span>
    </button>
  </div>
</template>
