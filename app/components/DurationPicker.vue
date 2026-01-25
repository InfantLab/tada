<script setup lang="ts">
/**
 * DurationPicker - Smart duration input with natural language parsing
 *
 * Features:
 * - Smart text parsing: "20", "20m", "1h 30m", "1:30", "90 minutes"
 * - Context-aware quick picks (meditation, exercise, work, general)
 * - Recent durations from user history
 * - Mini-stepper for fine adjustment (±1m, ±5m)
 *
 * Uses QuickValuePicker as base component
 */
import { parseDuration, formatDuration } from "~/utils/durationParser";

export type DurationContext = "meditation" | "exercise" | "work" | "general";

const props = withDefaults(
  defineProps<{
    /** Current duration in seconds (null = empty) */
    modelValue: number | null;
    /** Context for preset selection */
    context?: DurationContext;
    /** Show recent durations from history */
    showRecent?: boolean;
    /** Override default quick picks (in seconds) */
    quickPicks?: number[];
    /** Show mini-stepper controls */
    showStepper?: boolean;
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
    context: "general",
    showRecent: true,
    quickPicks: undefined,
    showStepper: true,
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

// Format seconds for display (e.g., 1200 → "20m", 5400 → "1h 30m")
function formatValueForDisplay(seconds: number): string {
  return formatDuration(seconds);
}

// Parse input string to seconds
function parseInputValue(input: string): number | null {
  // Handle empty input
  if (!input.trim()) return null;

  // Try duration parser
  const result = parseDuration(input);
  if (result !== null) return result;

  // Fallback: treat bare numbers as minutes
  const bareNumber = parseInt(input.trim(), 10);
  if (!isNaN(bareNumber) && bareNumber > 0) {
    return bareNumber * 60; // Assume minutes
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
