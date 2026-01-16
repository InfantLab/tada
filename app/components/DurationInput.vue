<script setup lang="ts">
/**
 * DurationInput - Input component for duration in minutes and seconds
 *
 * Features:
 * - Separate minutes and seconds inputs
 * - Validates non-negative values
 * - Emits total seconds
 * - Quick presets for common durations
 */

const props = defineProps<{
  modelValue: number | null | undefined; // Total seconds
  label?: string;
  disabled?: boolean;
  showPresets?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number | null): void;
}>();

// Parse total seconds into minutes and seconds
const minutes = computed({
  get: () => {
    if (props.modelValue === null || props.modelValue === undefined) return 0;
    return Math.floor(props.modelValue / 60);
  },
  set: (val: number) => {
    const secs = seconds.value;
    const total = Math.max(0, val) * 60 + secs;
    emit("update:modelValue", total > 0 ? total : null);
  },
});

const seconds = computed({
  get: () => {
    if (props.modelValue === null || props.modelValue === undefined) return 0;
    return props.modelValue % 60;
  },
  set: (val: number) => {
    const mins = minutes.value;
    const clampedSecs = Math.min(59, Math.max(0, val));
    const total = mins * 60 + clampedSecs;
    emit("update:modelValue", total > 0 ? total : null);
  },
});

// Display string
const displayDuration = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) return "—";
  const mins = Math.floor(props.modelValue / 60);
  const secs = props.modelValue % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
});

// Quick presets
const presets = [
  { label: "5m", value: 5 * 60 },
  { label: "10m", value: 10 * 60 },
  { label: "15m", value: 15 * 60 },
  { label: "20m", value: 20 * 60 },
  { label: "30m", value: 30 * 60 },
  { label: "45m", value: 45 * 60 },
  { label: "1h", value: 60 * 60 },
];

function setPreset(value: number) {
  emit("update:modelValue", value);
}

function clear() {
  emit("update:modelValue", null);
}
</script>

<template>
  <div class="space-y-2">
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
          :value="minutes"
          type="number"
          min="0"
          :disabled="disabled"
          class="w-16 px-2 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white text-center focus:ring-2 focus:ring-tada-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          @input="
            minutes = parseInt(($event.target as HTMLInputElement).value) || 0
          "
        />
        <span class="text-sm text-stone-500 dark:text-stone-400">min</span>
      </div>

      <!-- Seconds input -->
      <div class="flex items-center gap-1">
        <input
          :value="seconds"
          type="number"
          min="0"
          max="59"
          :disabled="disabled"
          class="w-16 px-2 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white text-center focus:ring-2 focus:ring-tada-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          @input="
            seconds = parseInt(($event.target as HTMLInputElement).value) || 0
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
        @click="clear"
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
    <div v-if="showPresets !== false" class="flex flex-wrap gap-1">
      <button
        v-for="preset in presets"
        :key="preset.value"
        type="button"
        :disabled="disabled"
        class="px-2 py-1 text-xs rounded transition-colors"
        :class="
          modelValue === preset.value
            ? 'bg-tada-100 dark:bg-tada-900/30 text-tada-700 dark:text-tada-300'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
        "
        @click="setPreset(preset.value)"
      >
        {{ preset.label }}
      </button>
    </div>
  </div>
</template>
