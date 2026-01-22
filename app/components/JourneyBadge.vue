<script setup lang="ts">
// JourneyBadge - Accumulated time celebration display with zoom-level awareness

interface Props {
  zoomLevel?: "day" | "week" | "month" | "year";
}

const props = withDefaults(defineProps<Props>(), {
  zoomLevel: "day",
});

interface PeriodStats {
  count: number;
  hours: number;
}

interface EntryStats {
  totalHours: number;
  totalSessions: number;
  oldestEntry: string | null;
  thisWeek: PeriodStats;
  thisMonth: PeriodStats;
  thisYear: PeriodStats;
  categories: Record<string, number>;
}

const stats = ref<EntryStats | null>(null);
const isLoading = ref(true);
const showDetails = ref(false);

// Get period stats and label based on zoom level
const periodStats = computed(() => {
  if (!stats.value) return { count: 0, hours: 0, label: "this week" };

  switch (props.zoomLevel) {
    case "year":
      return { ...stats.value.thisYear, label: "this year" };
    case "month":
      return { ...stats.value.thisMonth, label: "this month" };
    case "week":
    case "day":
    default:
      return { ...stats.value.thisWeek, label: "this week" };
  }
});

async function fetchStats() {
  try {
    isLoading.value = true;
    stats.value = await $fetch<typeof stats.value>("/api/entries/stats");
  } catch (err) {
    console.error("Failed to fetch stats:", err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchStats);

// Format total hours nicely
function formatTotalHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  return `${Math.round(hours)}h`;
}

// Format the start date nicely: "5 February 2016"
function formatStartDate(oldestEntry: string | null): string {
  if (!oldestEntry) return "";
  const start = new Date(oldestEntry);
  return start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Calculate journey duration in a human-readable format
function formatJourneyDuration(oldestEntry: string | null): string {
  if (!oldestEntry) return "";
  const start = new Date(oldestEntry);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(days / 365.25);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months % 12 > 0) parts.push(`${months % 12}mo`);
  if (parts.length === 0 && weeks > 0) parts.push(`${weeks}w`);
  if (parts.length === 0) parts.push(`${days}d`);

  return parts.join(" ");
}
</script>

<template>
  <div
    class="rounded-xl bg-gradient-to-br from-tada-50 to-stone-50 dark:from-tada-900/20 dark:to-stone-800/50 border border-tada-200/50 dark:border-tada-700/30 p-4"
  >
    <!-- Loading state -->
    <div v-if="isLoading" class="animate-pulse">
      <div class="h-6 bg-stone-200 dark:bg-stone-700 rounded w-32 mb-2" />
      <div class="h-4 bg-stone-200 dark:bg-stone-700 rounded w-48" />
    </div>

    <!-- Stats display -->
    <div v-else-if="stats" class="space-y-3">
      <!-- Period stats - zoom-level aware, celebrate prominently! -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <span class="text-2xl">⚡</span>
          <span class="text-2xl font-bold text-stone-800 dark:text-stone-100">
            {{ periodStats.count.toLocaleString() }} moments
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-2xl">⌛</span>
          <span class="text-2xl font-bold text-stone-800 dark:text-stone-100">
            {{ formatTotalHours(periodStats.hours) }} of practice {{ periodStats.label }}
          </span>
        </div>
      </div>

      <!-- Total journey stats - subtle -->
      <div class="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <span>🪷</span>
        <span>
          {{ stats.totalSessions.toLocaleString() }} moments ·
          {{ formatTotalHours(stats.totalHours) }}
          <span v-if="stats.oldestEntry">
            since {{ formatStartDate(stats.oldestEntry) }}
            <span class="text-stone-400 dark:text-stone-500">
              ({{ formatJourneyDuration(stats.oldestEntry) }})
            </span>
          </span>
        </span>
      </div>

      <!-- Expandable details -->
      <button
        v-if="Object.keys(stats.categories).length > 1"
        type="button"
        class="text-sm text-tada-600 dark:text-tada-400 hover:underline"
        @click="showDetails = !showDetails"
      >
        {{ showDetails ? "Hide details" : "Show breakdown" }}
      </button>

      <!-- Category breakdown -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="showDetails"
          class="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200/50 dark:border-stone-700/30"
        >
          <div
            v-for="(count, category) in stats.categories"
            :key="category"
            class="text-sm text-stone-600 dark:text-stone-400"
          >
            <span class="capitalize">{{ category }}</span
            >:
            <span class="font-medium text-stone-700 dark:text-stone-300">{{
              count
            }}</span>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-2">
      <span class="text-stone-500 dark:text-stone-400">
        Start your journey today ✨
      </span>
    </div>
  </div>
</template>
