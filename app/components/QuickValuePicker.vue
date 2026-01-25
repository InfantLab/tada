<script setup lang="ts">
/**
 * QuickValuePicker - Shared base component for Duration and Count pickers
 *
 * Features:
 * - Smart text input with custom parsing
 * - Quick pick buttons for common values
 * - Recent values from user history
 * - Mini-stepper for fine adjustments (±small, ±large)
 * - Consistent UX across duration and count inputs
 *
 * Philosophy: "One engine, many faces" - same interaction pattern, different value types
 */

const props = withDefaults(
  defineProps<{
    /** Current value (null = empty) */
    modelValue: number | null;
    /** Quick pick preset values */
    quickPicks?: number[];
    /** Recently used values from history */
    recentValues?: number[];
    /** Format value for display (e.g., "20m" or "30") */
    formatValue?: (value: number) => string;
    /** Parse input string to number (e.g., "20m" → 1200) */
    parseValue?: (input: string) => number | null;
    /** Small step increment (e.g., ±1 or ±60 for 1 minute) */
    stepSmall?: number;
    /** Large step increment (e.g., ±5 or ±300 for 5 minutes) */
    stepLarge?: number;
    /** Minimum allowed value */
    min?: number;
    /** Maximum allowed value */
    max?: number;
    /** Placeholder text for input */
    placeholder?: string;
    /** Unit label displayed after input (e.g., "min" or "reps") */
    unit?: string;
    /** Show mini-stepper controls */
    showStepper?: boolean;
    /** Show recent values section */
    showRecent?: boolean;
    /** Disable all interactions */
    disabled?: boolean;
    /** Label for accessibility */
    label?: string;
  }>(),
  {
    quickPicks: () => [],
    recentValues: () => [],
    formatValue: (v: number) => String(v),
    parseValue: (s: string) => {
      const n = parseInt(s, 10);
      return isNaN(n) ? null : n;
    },
    stepSmall: 1,
    stepLarge: 5,
    min: 0,
    max: undefined,
    placeholder: "",
    unit: "",
    showStepper: true,
    showRecent: true,
    disabled: false,
    label: undefined,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: number | null): void;
}>();

// Internal text input state
const inputText = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

// Sync inputText with modelValue when modelValue changes externally
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== null) {
      // Only update if the input isn't focused (avoid overwriting user typing)
      if (document.activeElement !== inputRef.value) {
        inputText.value = props.formatValue(newVal);
      }
    } else {
      inputText.value = "";
    }
  },
  { immediate: true },
);

// Parse and emit on input
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  inputText.value = target.value;

  if (target.value === "") {
    emit("update:modelValue", null);
    return;
  }

  const parsed = props.parseValue(target.value);
  if (parsed !== null) {
    const clamped = clampValue(parsed);
    emit("update:modelValue", clamped);
  }
}

// Handle blur - format the display
function handleBlur() {
  if (props.modelValue !== null) {
    inputText.value = props.formatValue(props.modelValue);
  }
}

// Clamp value within bounds
function clampValue(value: number): number {
  let result = value;
  if (props.min !== undefined) result = Math.max(props.min, result);
  if (props.max !== undefined) result = Math.min(props.max, result);
  return result;
}

// Quick pick selection
function selectQuickPick(value: number) {
  const clamped = clampValue(value);
  inputText.value = props.formatValue(clamped);
  emit("update:modelValue", clamped);
}

// Stepper functions
function stepUp(amount: number) {
  const current = props.modelValue ?? 0;
  const newValue = clampValue(current + amount);
  inputText.value = props.formatValue(newValue);
  emit("update:modelValue", newValue);
}

function stepDown(amount: number) {
  const current = props.modelValue ?? 0;
  const newValue = clampValue(current - amount);
  if (newValue < (props.min ?? 0)) {
    emit("update:modelValue", null);
    inputText.value = "";
  } else {
    inputText.value = props.formatValue(newValue);
    emit("update:modelValue", newValue);
  }
}

// Clear value
function clear() {
  inputText.value = "";
  emit("update:modelValue", null);
}

// Filter recent values that aren't already in quick picks
const filteredRecentValues = computed(() => {
  if (!props.recentValues?.length) return [];
  const quickSet = new Set(props.quickPicks);
  return props.recentValues.filter((v) => !quickSet.has(v)).slice(0, 5);
});

// Check if value is currently selected
function isSelected(value: number): boolean {
  return props.modelValue === value;
}
</script>

<template>
  <div class="space-y-3">
    <!-- Label -->
    <label
      v-if="label"
      class="block text-sm font-medium text-stone-700 dark:text-stone-300"
    >
      {{ label }}
    </label>

    <!-- Input with stepper -->
    <div class="flex items-center gap-2">
      <!-- Large step down -->
      <button
        v-if="showStepper"
        type="button"
        :disabled="
          disabled || modelValue === null || (modelValue ?? 0) <= (min ?? 0)
        "
        class="p-2 rounded-lg bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        :title="`-${stepLarge}`"
        @click="stepDown(stepLarge)"
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
            d="M18 12H6"
          />
        </svg>
      </button>

      <!-- Small step down -->
      <button
        v-if="showStepper"
        type="button"
        :disabled="
          disabled || modelValue === null || (modelValue ?? 0) <= (min ?? 0)
        "
        class="p-1.5 rounded-md bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        :title="`-${stepSmall}`"
        @click="stepDown(stepSmall)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 12H4"
          />
        </svg>
      </button>

      <!-- Text input -->
      <div class="flex-1 flex items-center gap-1">
        <input
          ref="inputRef"
          :value="inputText"
          type="text"
          inputmode="numeric"
          :placeholder="placeholder"
          :disabled="disabled"
          class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white text-center focus:ring-2 focus:ring-tada-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          @input="handleInput"
          @blur="handleBlur"
        />
        <span
          v-if="unit"
          class="text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap"
        >
          {{ unit }}
        </span>
      </div>

      <!-- Small step up -->
      <button
        v-if="showStepper"
        type="button"
        :disabled="disabled || (max !== undefined && (modelValue ?? 0) >= max)"
        class="p-1.5 rounded-md bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        :title="`+${stepSmall}`"
        @click="stepUp(stepSmall)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      <!-- Large step up -->
      <button
        v-if="showStepper"
        type="button"
        :disabled="disabled || (max !== undefined && (modelValue ?? 0) >= max)"
        class="p-2 rounded-lg bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        :title="`+${stepLarge}`"
        @click="stepUp(stepLarge)"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      <!-- Clear button -->
      <button
        v-if="modelValue !== null"
        type="button"
        :disabled="disabled"
        class="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 disabled:opacity-50"
        title="Clear"
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

    <!-- Quick picks -->
    <div v-if="quickPicks.length > 0" class="space-y-1">
      <span class="text-xs text-stone-500 dark:text-stone-400">Quick:</span>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="value in quickPicks"
          :key="value"
          type="button"
          :disabled="disabled"
          class="px-2 py-1 text-xs rounded transition-colors"
          :class="
            isSelected(value)
              ? 'bg-tada-100 dark:bg-tada-900/30 text-tada-700 dark:text-tada-300 ring-1 ring-tada-300 dark:ring-tada-700'
              : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
          "
          @click="selectQuickPick(value)"
        >
          {{ formatValue(value) }}
        </button>
      </div>
    </div>

    <!-- Recent values -->
    <div v-if="showRecent && filteredRecentValues.length > 0" class="space-y-1">
      <span class="text-xs text-stone-500 dark:text-stone-400">Recent:</span>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="value in filteredRecentValues"
          :key="value"
          type="button"
          :disabled="disabled"
          class="px-2 py-1 text-xs rounded transition-colors"
          :class="
            isSelected(value)
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700'
              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
          "
          @click="selectQuickPick(value)"
        >
          {{ formatValue(value) }}
        </button>
      </div>
    </div>
  </div>
</template>
