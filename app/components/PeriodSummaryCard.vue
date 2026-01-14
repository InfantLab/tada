<script setup lang="ts">
// PeriodSummaryCard - A clickable card showing summary for a time period
interface Props {
  label: string;
  period: string;
  entryCount: number;
  totalHours: number;
  isClickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isClickable: true,
});

const emit = defineEmits<{
  click: [period: string];
}>();

// Format hours in human-readable way
function formatHours(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return mins > 0 ? `${mins}m` : "—";
  }
  if (hours < 24) {
    return `${Math.round(hours * 10) / 10}h`;
  }
  const days = hours / 24;
  return `${Math.round(days * 10) / 10}d`;
}

function handleClick() {
  if (props.isClickable) {
    emit("click", props.period);
  }
}
</script>

<template>
  <component
    :is="isClickable ? 'button' : 'div'"
    type="button"
    class="w-full text-left p-4 rounded-xl border transition-all duration-200"
    :class="
      isClickable
        ? 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:border-tada-300 dark:hover:border-tada-600 hover:shadow-md cursor-pointer'
        : 'bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-700/50'
    "
    @click="handleClick"
  >
    <div class="flex items-center justify-between">
      <div>
        <h3 class="font-semibold text-stone-800 dark:text-stone-100 text-lg">
          {{ label }}
        </h3>
        <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
          {{ entryCount.toLocaleString() }}
          {{ entryCount === 1 ? "moment" : "moments" }}
          <span v-if="totalHours > 0" class="ml-2">
            · {{ formatHours(totalHours) }}
          </span>
        </p>
      </div>

      <!-- Arrow indicator for clickable cards -->
      <div
        v-if="isClickable"
        class="flex-shrink-0 w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 text-stone-400 dark:text-stone-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>

    <!-- Mini progress bar showing relative activity -->
    <div
      v-if="totalHours > 0"
      class="mt-3 h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden"
    >
      <div
        class="h-full bg-gradient-to-r from-tada-400 to-tada-500 rounded-full transition-all duration-300"
        :style="{ width: `${Math.min(100, (totalHours / 10) * 100)}%` }"
      />
    </div>
  </component>
</template>
