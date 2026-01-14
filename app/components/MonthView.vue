<script setup lang="ts">
// MonthView - Shows monthly summary cards for a specific year with tap-to-zoom into days

interface Props {
  year?: string; // If provided, show months for this year only
}

const props = withDefaults(defineProps<Props>(), {
  year: "",
});

const emit = defineEmits<{
  "zoom-to-month": [month: string];
  back: [];
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
    const params = new URLSearchParams({ period: "month" });
    if (props.year) {
      params.set("year", props.year);
    }
    summaryData.value = await $fetch(
      `/api/entries/summary?${params.toString()}`
    );
  } catch (err: unknown) {
    console.error("Failed to fetch month summary:", err);
    error.value = err instanceof Error ? err.message : "Failed to load summary";
  } finally {
    isLoading.value = false;
  }
}

// Reload when year changes
watch(() => props.year, fetchSummary);
onMounted(fetchSummary);

function handleMonthClick(period: string) {
  emit("zoom-to-month", period);
}
</script>

<template>
  <div class="month-view">
    <!-- Back button when viewing a specific year -->
    <button
      v-if="year"
      type="button"
      class="flex items-center gap-2 mb-4 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
      @click="emit('back')"
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
          d="M15 19l-7-7 7-7"
        />
      </svg>
      Back to all years
    </button>

    <!-- Year header -->
    <div v-if="year" class="mb-4">
      <h2 class="text-xl font-bold text-stone-800 dark:text-stone-100">
        {{ year }}
      </h2>
      <p v-if="summaryData" class="text-sm text-stone-500 dark:text-stone-400">
        {{ summaryData.totals.entryCount.toLocaleString() }} moments ·
        {{ Math.round(summaryData.totals.totalHours) }}h total
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-3">
      <div
        v-for="i in 6"
        :key="i"
        class="h-20 bg-stone-100 dark:bg-stone-800 rounded-xl animate-pulse"
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
      <div class="text-4xl mb-3">📆</div>
      <p class="text-stone-500 dark:text-stone-400">
        No entries {{ year ? `in ${year}` : "yet" }}
      </p>
    </div>

    <!-- Month cards -->
    <div v-else class="space-y-2">
      <PeriodSummaryCard
        v-for="period in summaryData.periods"
        :key="period.period"
        :label="period.label"
        :period="period.period"
        :entry-count="period.entryCount"
        :total-hours="period.totalHours"
        @click="handleMonthClick"
      />
    </div>
  </div>
</template>
