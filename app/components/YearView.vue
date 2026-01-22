<script setup lang="ts">
// YearView - Shows yearly summary cards with tap-to-zoom into months

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

const emit = defineEmits<{
  "zoom-to-year": [year: string];
}>();

const summaryData = ref<SummaryResponse | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

async function fetchSummary() {
  try {
    isLoading.value = true;
    error.value = null;
    summaryData.value = await $fetch<SummaryResponse>(
      "/api/entries/summary?period=year",
    );
  } catch (err: unknown) {
    console.error("Failed to fetch year summary:", err);
    error.value = err instanceof Error ? err.message : "Failed to load summary";
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchSummary);

function handleYearClick(period: string) {
  emit("zoom-to-year", period);
}
</script>

<template>
  <div class="year-view">
    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-3">
      <div
        v-for="i in 3"
        :key="i"
        class="h-24 bg-stone-100 dark:bg-stone-800 rounded-xl animate-pulse"
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
      <p class="text-stone-500 dark:text-stone-400">No entries yet</p>
    </div>

    <!-- Year cards -->
    <div v-else class="space-y-3">
      <!-- Year cards -->
      <PeriodSummaryCard
        v-for="period in summaryData.periods"
        :key="period.period"
        :label="period.label"
        :period="period.period"
        :entry-count="period.entryCount"
        :total-hours="period.totalHours"
        @click="handleYearClick"
      />
    </div>
  </div>
</template>
