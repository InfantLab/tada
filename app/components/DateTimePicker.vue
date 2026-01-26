<script setup lang="ts">
/**
 * DateTimePicker - Combined date and time picker with quick presets
 *
 * Features:
 * - Combined date and time selection
 * - Quick presets: Now, Today, Yesterday, This Morning, Last Night
 * - Time shortcuts for common times
 * - Emits ISO 8601 string
 *
 * Used in QuickEntryModal for past entry creation
 */

const props = withDefaults(
  defineProps<{
    /** ISO 8601 datetime string */
    modelValue: string;
    /** Label text */
    label?: string;
    /** Disable all interactions */
    disabled?: boolean;
    /** Maximum date (default: now) */
    maxDate?: string;
    /** Show time quick picks */
    showTimePresets?: boolean;
  }>(),
  {
    label: undefined,
    disabled: false,
    maxDate: undefined,
    showTimePresets: true,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

// Parse ISO string into date and time parts
const dateValue = computed({
  get: () => {
    if (!props.modelValue) return "";
    const date = new Date(props.modelValue);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  },
  set: (val: string) => {
    if (!val) return;
    const currentTime = timeValue.value || "12:00";
    const newDate = new Date(`${val}T${currentTime}`);
    if (!isNaN(newDate.getTime())) {
      emit("update:modelValue", newDate.toISOString());
    }
  },
});

const timeValue = computed({
  get: () => {
    if (!props.modelValue) return "";
    const date = new Date(props.modelValue);
    if (isNaN(date.getTime())) return "";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  },
  set: (val: string) => {
    if (!val) return;
    const currentDate =
      dateValue.value || new Date().toISOString().split("T")[0];
    const newDate = new Date(`${currentDate}T${val}`);
    if (!isNaN(newDate.getTime())) {
      emit("update:modelValue", newDate.toISOString());
    }
  },
});

// Computed max date for input
const maxDateValue = computed(() => {
  if (props.maxDate) return props.maxDate.split("T")[0];
  return new Date().toISOString().split("T")[0];
});

// Ref for programmatic date picker opening
const dateInputRef = ref<HTMLInputElement | null>(null);

// Open native date picker
function openDatePicker() {
  if (dateInputRef.value && "showPicker" in dateInputRef.value) {
    (
      dateInputRef.value as HTMLInputElement & { showPicker: () => void }
    ).showPicker();
  } else {
    // Fallback: focus the input
    dateInputRef.value?.focus();
  }
}

// Date presets
function setNow() {
  emit("update:modelValue", new Date().toISOString());
}

function setToday() {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const currentTime =
    timeValue.value ||
    `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
  const newDate = new Date(`${dateStr}T${currentTime}`);
  emit("update:modelValue", newDate.toISOString());
}

function setYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];
  const currentTime = timeValue.value || "12:00";
  const newDate = new Date(`${dateStr}T${currentTime}`);
  emit("update:modelValue", newDate.toISOString());
}

function setThisMorning() {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const newDate = new Date(`${dateStr}T07:00`);
  emit("update:modelValue", newDate.toISOString());
}

function setLastNight() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];
  const newDate = new Date(`${dateStr}T21:00`);
  emit("update:modelValue", newDate.toISOString());
}

// Time quick picks
const timePresets = [
  { label: "6am", value: "06:00" },
  { label: "7am", value: "07:00" },
  { label: "8am", value: "08:00" },
  { label: "12pm", value: "12:00" },
  { label: "6pm", value: "18:00" },
  { label: "9pm", value: "21:00" },
];

function setTimePreset(time: string) {
  const currentDate = dateValue.value || new Date().toISOString().split("T")[0];
  const newDate = new Date(`${currentDate}T${time}`);
  if (!isNaN(newDate.getTime())) {
    emit("update:modelValue", newDate.toISOString());
  }
}

// Check if time preset is selected
function isTimeSelected(preset: string): boolean {
  return timeValue.value === preset;
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

    <!-- Date and Time inputs -->
    <div class="flex gap-2">
      <!-- Date input with calendar button -->
      <div class="flex-1 relative">
        <input
          ref="dateInputRef"
          v-model="dateValue"
          type="date"
          :max="maxDateValue"
          :disabled="disabled"
          class="w-full px-3 py-2 pr-10 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-tada-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          :disabled="disabled"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 disabled:opacity-50"
          @click="openDatePicker"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>

      <!-- Time input -->
      <div class="w-28">
        <input
          v-model="timeValue"
          type="time"
          :disabled="disabled"
          class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-tada-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>

    <!-- Date quick presets -->
    <div class="space-y-1">
      <span class="text-xs text-stone-500 dark:text-stone-400">When:</span>
      <div class="flex flex-wrap gap-1">
        <button
          type="button"
          :disabled="disabled"
          class="px-2 py-1 text-xs rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="setNow"
        >
          Now
        </button>
        <button
          type="button"
          :disabled="disabled"
          class="px-2 py-1 text-xs rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="setThisMorning"
        >
          This Morning
        </button>
        <button
          type="button"
          :disabled="disabled"
          class="px-2 py-1 text-xs rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="setToday"
        >
          Today
        </button>
        <button
          type="button"
          :disabled="disabled"
          class="px-2 py-1 text-xs rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="setLastNight"
        >
          Last Night
        </button>
        <button
          type="button"
          :disabled="disabled"
          class="px-2 py-1 text-xs rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="setYesterday"
        >
          Yesterday
        </button>
      </div>
    </div>

    <!-- Time quick presets -->
    <div v-if="showTimePresets" class="space-y-1">
      <span class="text-xs text-stone-500 dark:text-stone-400">Time:</span>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="preset in timePresets"
          :key="preset.value"
          type="button"
          :disabled="disabled"
          class="px-2 py-1 text-xs rounded transition-colors"
          :class="
            isTimeSelected(preset.value)
              ? 'bg-tada-100 dark:bg-tada-900/30 text-tada-700 dark:text-tada-300 ring-1 ring-tada-300 dark:ring-tada-700'
              : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
          "
          @click="setTimePreset(preset.value)"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>
  </div>
</template>
