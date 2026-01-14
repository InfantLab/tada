<script setup lang="ts">
// ZoomToggle - Switch between timeline granularity levels
type ZoomLevel = "day" | "week" | "month" | "year";

interface Props {
  modelValue: ZoomLevel;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: ZoomLevel];
}>();

const zoomLevel = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const levels: { value: ZoomLevel; label: string; icon: string }[] = [
  { value: "day", label: "Day", icon: "☀️" },
  { value: "week", label: "Week", icon: "📅" },
  { value: "month", label: "Month", icon: "📆" },
  { value: "year", label: "Year", icon: "🔭" },
];
</script>

<template>
  <div
    class="sticky top-0 z-10 flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg shadow-sm"
  >
    <button
      v-for="level in levels"
      :key="level.value"
      type="button"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200"
      :class="
        zoomLevel === level.value
          ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm'
          : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
      "
      @click="zoomLevel = level.value"
    >
      <span class="text-base">{{ level.icon }}</span>
      <span class="hidden sm:inline">{{ level.label }}</span>
    </button>
  </div>
</template>
