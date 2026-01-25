<script setup lang="ts">
/**
 * CountPicker - Count/reps input with exercise-aware presets
 *
 * Features:
 * - Context-aware quick picks (bodyweight, weighted, cardio)
 * - Recent counts from user history
 * - Mini-stepper for fine adjustment (±1, ±5)
 * - Consistent UX with DurationPicker (shared base component)
 *
 * Uses QuickValuePicker as base component
 */

export type CountContext = "bodyweight" | "weighted" | "cardio" | "general";

const props = withDefaults(
  defineProps<{
    /** Current count value (null = empty) */
    modelValue: number | null;
    /** Context for preset selection */
    context?: CountContext;
    /** Show recent counts from history */
    showRecent?: boolean;
    /** Override default quick picks */
    quickPicks?: number[];
    /** Show mini-stepper controls */
    showStepper?: boolean;
    /** Minimum count */
    min?: number;
    /** Maximum count */
    max?: number;
    /** Disable all interactions */
    disabled?: boolean;
    /** Label text */
    label?: string;
    /** Unit label (e.g., "reps", "sets", "laps") */
    unit?: string;
  }>(),
  {
    context: "general",
    showRecent: true,
    quickPicks: undefined,
    showStepper: true,
    min: 1,
    max: 1000,
    disabled: false,
    label: undefined,
    unit: "reps",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: number | null): void;
}>();

// Context-aware quick picks
const CONTEXT_PRESETS: Record<CountContext, number[]> = {
  bodyweight: [10, 15, 20, 25, 30, 40, 50], // Push-ups, burpees, squats
  weighted: [5, 8, 10, 12, 15, 20], // Deadlifts, bench press (lower reps)
  cardio: [10, 20, 30, 50, 100], // Jumping jacks, mountain climbers
  general: [5, 10, 15, 20, 25, 30], // Default fallback
};

// Get quick picks based on context or override
const resolvedQuickPicks = computed(() => {
  if (props.quickPicks) return props.quickPicks;
  return CONTEXT_PRESETS[props.context] || CONTEXT_PRESETS.general;
});

// TODO: Fetch from API - GET /api/counts/recent
const recentCounts = ref<number[]>([]);

// Format value for display
function formatValueForDisplay(count: number): string {
  return String(count);
}

// Parse input string to number
function parseInputValue(input: string): number | null {
  if (!input.trim()) return null;

  // Extract first number from input
  const match = input.match(/\d+/);
  if (match) {
    const value = parseInt(match[0], 10);
    return isNaN(value) ? null : value;
  }

  return null;
}

// Handle value update from QuickValuePicker
function handleUpdate(value: number | null) {
  emit("update:modelValue", value);
}
</script>

<template>
  <QuickValuePicker
    :model-value="modelValue"
    :quick-picks="resolvedQuickPicks"
    :recent-values="recentCounts"
    :format-value="formatValueForDisplay"
    :parse-value="parseInputValue"
    :step-small="1"
    :step-large="5"
    :min="min"
    :max="max"
    placeholder="Enter count"
    :unit="unit"
    :show-stepper="showStepper"
    :show-recent="showRecent"
    :disabled="disabled"
    :label="label"
    @update:model-value="handleUpdate"
  />
</template>
