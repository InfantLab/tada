<script setup lang="ts">
/**
 * DateTimeInput - A nice date and time picker component
 *
 * Features:
 * - Separate date and time inputs for better UX
 * - Mobile-friendly
 * - Emits ISO 8601 string
 */

const props = defineProps<{
  modelValue: string; // ISO 8601 string
  label?: string;
  disabled?: boolean;
}>();

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

// Quick date presets
function setToday() {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const currentTime =
    timeValue.value ||
    `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  const newDate = new Date(`${dateStr}T${currentTime}`);
  emit("update:modelValue", newDate.toISOString());
}

function setNow() {
  emit("update:modelValue", new Date().toISOString());
}

function setYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];
  const currentTime = timeValue.value || "12:00";
  const newDate = new Date(`${dateStr}T${currentTime}`);
  emit("update:modelValue", newDate.toISOString());
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

    <div class="flex gap-2">
      <!-- Date input -->
      <div class="flex-1">
        <input
          v-model="dateValue"
          type="date"
          :disabled="disabled"
          class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-tada-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
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

    <!-- Quick presets -->
    <div class="flex gap-2 text-xs">
      <button
        type="button"
        :disabled="disabled"
        class="px-2 py-1 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="setNow"
      >
        Now
      </button>
      <button
        type="button"
        :disabled="disabled"
        class="px-2 py-1 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="setToday"
      >
        Today
      </button>
      <button
        type="button"
        :disabled="disabled"
        class="px-2 py-1 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="setYesterday"
      >
        Yesterday
      </button>
    </div>
  </div>
</template>
