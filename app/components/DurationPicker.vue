<script setup lang="ts">
/**
 * DurationPicker - Unified duration input component
 *
 * Two variants:
 * - "smart" (default): Natural language parsing, context-aware quick picks,
 *   recent durations, mini-stepper. Great for creating new entries.
 * - "precise": Separate minutes/seconds inputs with optional presets.
 *   Great for editing existing entries where exact values matter.
 *
 * Uses QuickValuePicker as base component for the smart variant.
 */
import { parseDuration, formatDuration } from "~/utils/durationParser";

export type DurationContext = "meditation" | "exercise" | "work" | "general";

const props = withDefaults(
  defineProps<{
    /** Current duration in seconds (null = empty) */
    modelValue: number | null;
    /** "smart" for natural language input, "precise" for min/sec fields */
    variant?: "smart" | "precise";
    /** Context for preset selection */
    context?: DurationContext;
    /** Show recent durations from history (smart variant) */
    showRecent?: boolean;
    /** Override default quick picks (in seconds) */
    quickPicks?: number[];
    /** Show mini-stepper controls (smart variant) */
    showStepper?: boolean;
    /** Show quick preset buttons (precise variant) */
    showPresets?: boolean;
    /** Minimum duration in seconds */
    minDuration?: number;
    /** Maximum duration in seconds */
    maxDuration?: number;
    /** Disable all interactions */
    disabled?: boolean;
    /** Label text */
    label?: string;
  }>(),
  {
    variant: "smart",
    context: "general",
    showRecent: true,
    quickPicks: undefined,
    showStepper: true,
    showPresets: true,
    minDuration: 0,
    maxDuration: undefined,
    disabled: false,
    label: undefined,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: number | null): void;
}>();

// Context-aware quick picks (in seconds)
const CONTEXT_PRESETS: Record<DurationContext, number[]> = {
  meditation: [5, 10, 15, 20, 25, 30, 45, 60].map((m) => m * 60),
  exercise: [15, 20, 30, 45, 60, 90].map((m) => m * 60),
  work: [25, 30, 45, 60, 90, 120].map((m) => m * 60), // Pomodoro-friendly
  general: [5, 10, 15, 20, 30, 45, 60].map((m) => m * 60),
};

// Get quick picks based on context or override
const resolvedQuickPicks = computed(() => {
  if (props.quickPicks) return props.quickPicks;
  return CONTEXT_PRESETS[props.context] || CONTEXT_PRESETS.general;
});

// TODO: Fetch from API - GET /api/durations/recent
const recentDurations = ref<number[]>([]);

// --- Smart variant helpers ---

// Format seconds for display (e.g., 1200 → "20m", 5400 → "1h 30m")
function formatValueForDisplay(seconds: number): string {
  return formatDuration(seconds);
}

// Parse input string to seconds
function parseInputValue(input: string): number | null {
  if (!input.trim()) return null;

  const result = parseDuration(input);
  if (result !== null) return result.seconds;

  // Fallback: treat bare numbers as minutes
  const bareNumber = parseInt(input.trim(), 10);
  if (!isNaN(bareNumber) && bareNumber > 0) {
    return bareNumber * 60;
  }

  return null;
}

function handleUpdate(value: number | null) {
  emit("update:modelValue", value);
}

// --- Precise variant helpers ---

const preciseMinutes = computed({
  get: () => {
    if (props.modelValue === null || props.modelValue === undefined) return 0;
    return Math.floor(props.modelValue / 60);
  },
  set: (val: number) => {
    const secs = preciseSeconds.value;
    const total = Math.max(0, val) * 60 + secs;
    emit("update:modelValue", total > 0 ? total : null);
  },
});

const preciseSeconds = computed({
  get: () => {
    if (props.modelValue === null || props.modelValue === undefined) return 0;
    return props.modelValue % 60;
  },
  set: (val: number) => {
    const mins = preciseMinutes.value;
    const clampedSecs = Math.min(59, Math.max(0, val));
    const total = mins * 60 + clampedSecs;
    emit("update:modelValue", total > 0 ? total : null);
  },
});

function setPreset(value: number) {
  emit("update:modelValue", value);
}

function clearDuration() {
  emit("update:modelValue", null);
}
</script>

<template>
  <!-- Precise variant: separate min/sec inputs -->
  <div v-if="variant === 'precise'" class="space-y-2">
    <label
      v-if="label"
      class="block text-sm font-medium text-stone-700 dark:text-stone-300"
    >
      {{ label }}
    </label>

    <div class="flex items-center gap-2">
      <!-- Minutes input -->
      <div class="flex items-center gap-1">
        <input
          :value="preciseMinutes"
          type="number"
          min="0"
          aria-label="Minutes"
          :disabled="disabled"
          class="w-16 px-2 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white text-center focus:ring-2 focus:ring-tada-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          @input="
            preciseMinutes =
              parseInt(($event.target as HTMLInputElement).value) || 0
          "
        />
        <span class="text-sm text-stone-500 dark:text-stone-400">min</span>
      </div>

      <!-- Seconds input -->
      <div class="flex items-center gap-1">
        <input
          :value="preciseSeconds"
          type="number"
          min="0"
          max="59"
          aria-label="Seconds"
          :disabled="disabled"
          class="w-16 px-2 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white text-center focus:ring-2 focus:ring-tada-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          @input="
            preciseSeconds =
              parseInt(($event.target as HTMLInputElement).value) || 0
          "
        />
        <span class="text-sm text-stone-500 dark:text-stone-400">sec</span>
      </div>

      <!-- Clear button -->
      <button
        v-if="modelValue"
        type="button"
        :disabled="disabled"
        class="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 disabled:opacity-50"
        title="Clear duration"
        @click="clearDuration"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Quick presets -->
    <div v-if="showPresets" class="flex flex-wrap gap-1">
      <button
        v-for="value in resolvedQuickPicks"
        :key="value"
        type="button"
        :disabled="disabled"
        class="px-2 py-1 text-xs rounded transition-colors"
        :class="
          modelValue === value
            ? 'bg-tada-100 dark:bg-tada-900/30 text-tada-700 dark:text-tada-300'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
        "
        @click="setPreset(value)"
      >
        {{ formatValueForDisplay(value) }}
      </button>
    </div>
  </div>

  <!-- Smart variant: QuickValuePicker with natural language parsing -->
  <QuickValuePicker
    v-else
    :model-value="modelValue"
    :quick-picks="resolvedQuickPicks"
    :recent-values="recentDurations"
    :format-value="formatValueForDisplay"
    :parse-value="parseInputValue"
    :step-small="60"
    :step-large="300"
    :min="minDuration"
    :max="maxDuration"
    placeholder="20m, 1h 30m..."
    unit=""
    :show-stepper="showStepper"
    :show-recent="showRecent"
    :disabled="disabled"
    :label="label"
    @update:model-value="handleUpdate"
  />
</template>
