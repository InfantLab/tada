<script setup lang="ts">
// WeekView - Shows weekly summary cards with tap-to-zoom into days

interface Props {
  year?: string; // If provided, show weeks for this year only
}

const props = withDefaults(defineProps<Props>(), {
  year: "",
});

const emit = defineEmits<{
  "zoom-to-week": [week: string];
}>();

interface PeriodSummary {
  label: string;
  period: string;
  entryCount: number;
  totalSeconds: number;
  totalHours: number;
}

interface SummaryResponse {
  periods: PeriodSummary[];
  totals: {
    entryCount: number;
    totalSeconds: number;
    totalHours: number;
  };
}

const summaryData = ref<SummaryResponse | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

async function fetchSummary() {
  try {
    isLoading.value = true;
    error.value = null;
    const params = new URLSearchParams({ period: "week" });
    if (props.year) {
      params.set("year", props.year);
    }
    summaryData.value = await $fetch(
      `/api/entries/summary?${params.toString()}`
    );
  } catch (err: unknown) {
    console.error("Failed to fetch week summary:", err);
    error.value = err instanceof Error ? err.message : "Failed to load summary";
  } finally {
    isLoading.value = false;
  }
}

// Reload when year changes
watch(() => props.year, fetchSummary);
onMounted(fetchSummary);

function handleWeekClick(period: string) {
  emit("zoom-to-week", period);
}
</script>

<template>
  <div class="week-view">
    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-3">
      <div
        v-for="i in 8"
        :key="i"
        class="h-16 bg-stone-100 dark:bg-stone-800 rounded-xl animate-pulse"
      />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-8">
      <div class="text-4xl mb-3">⚠️</div>
      <p class="text-stone-500 dark:text-stone-400">{{ error }}</p>
      <button
        class="mt-3 text-tada-600 dark:text-tada-400 hover:underline"
        @click="fetchSummary"
      >
        Try again
      </button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!summaryData || summaryData.periods.length === 0"
      class="text-center py-8"
    >
      <div class="text-4xl mb-3">📅</div>
      <p class="text-stone-500 dark:text-stone-400">No moments yet</p>
    </div>

    <!-- Week cards -->
    <div v-else class="space-y-2">
      <PeriodSummaryCard
        v-for="period in summaryData.periods"
        :key="period.period"
        :label="period.label"
        :period="period.period"
        :entry-count="period.entryCount"
        :total-hours="period.totalHours"
        @click="handleWeekClick"
      />
    </div>
  </div>
</template>
