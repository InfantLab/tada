<script setup lang="ts">
// Timeline page - the main view showing all entries chronologically
// Shows landing page for unauthenticated users

definePageMeta({
  layout: "default",
  auth: false, // Allow public access - we handle auth check manually
});

// Check authentication status
const isAuthenticated = ref(false);
const isCheckingAuth = ref(true);

onMounted(async () => {
  try {
    const response = await $fetch<{
      user: { id: string; username: string } | null;
    }>("/api/auth/session");
    isAuthenticated.value = !!response.user;
  } catch {
    isAuthenticated.value = false;
  } finally {
    isCheckingAuth.value = false;
  }
});

// Zoom level state
type ZoomLevel = "day" | "week" | "month" | "year";
const zoomLevel = ref<ZoomLevel>("day");
const selectedYear = ref<string>("");
const selectedMonth = ref<string>("");
const selectedWeek = ref<string>("");

// Filter state
const searchQuery = ref("");
const selectedCategory = ref("");
const selectedTimeRange = ref("all");

// Debounced search to avoid too many API calls
const debouncedSearch = ref("");
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, (value) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = value;
  }, 300);
});

// Zoom navigation handlers
function handleZoomToYear(year: string) {
  selectedYear.value = year;
  zoomLevel.value = "month";
}

function handleZoomToMonth(month: string) {
  selectedMonth.value = month;
  selectedTimeRange.value = "custom";
  zoomLevel.value = "day";
}

function handleZoomToWeek(week: string) {
  selectedWeek.value = week;
  selectedTimeRange.value = "custom";
  zoomLevel.value = "day";
}

function handleBackFromMonth() {
  selectedYear.value = "";
  zoomLevel.value = "year";
}

// Compute date range based on selected month or week
const customDateRange = computed(() => {
  // Handle selected month
  if (selectedMonth.value) {
    const [year, month] = selectedMonth.value.split("-");
    if (year && month) {
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
      return { from: startDate, to: endDate };
    }
  }

  // Handle selected week (YYYY-Www format)
  if (selectedWeek.value) {
    const match = selectedWeek.value.match(/^(\d{4})-W(\d{2})$/);
    if (match) {
      const year = parseInt(match[1] ?? "");
      const week = parseInt(match[2] ?? "");
      // Calculate start of ISO week
      const jan4 = new Date(year, 0, 4);
      const dayOfWeek = jan4.getDay() || 7;
      const startOfYear = new Date(jan4);
      startOfYear.setDate(jan4.getDate() - dayOfWeek + 1);
      const startOfWeek = new Date(startOfYear);
      startOfWeek.setDate(startOfYear.getDate() + (week - 1) * 7);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return {
        from: startOfWeek.toISOString().split("T")[0],
        to: endOfWeek.toISOString().split("T")[0],
      };
    }
  }

  return { from: undefined, to: undefined };
});

// Label for active filter
const activeFilterLabel = computed(() => {
  if (selectedMonth.value) {
    return new Date(selectedMonth.value + "-01").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }
  if (selectedWeek.value) {
    const match = selectedWeek.value.match(/^(\d{4})-W(\d{2})$/);
    if (match) {
      return `Week ${parseInt(match[2] ?? "0")}, ${match[1]}`;
    }
  }
  return "";
});

// Clear active filter
function clearFilter() {
  selectedMonth.value = "";
  selectedWeek.value = "";
  selectedTimeRange.value = "all";
}

// Reset filters when zoom level changes
watch(zoomLevel, (newLevel) => {
  if (newLevel === "year") {
    selectedYear.value = "";
    selectedMonth.value = "";
    selectedWeek.value = "";
  } else if (newLevel === "month" && !selectedYear.value) {
    selectedMonth.value = "";
  } else if (newLevel === "week") {
    selectedWeek.value = "";
  }
});
</script>

<template>
  <!-- Loading state while checking auth -->
  <div v-if="isCheckingAuth" class="flex items-center justify-center min-h-[50vh]">
    <div class="animate-pulse text-4xl">✨</div>
  </div>

  <!-- Landing page for unauthenticated users -->
  <LandingPage v-else-if="!isAuthenticated" />

  <!-- Timeline for authenticated users -->
  <div v-else>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
          Timeline
        </h1>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Your moments, captured
        </p>
      </div>
    </div>

    <!-- Journey Badge - Accumulated time celebration -->
    <div class="mb-4">
      <JourneyBadge :zoom-level="zoomLevel" />
    </div>

    <!-- Zoom Toggle -->
    <div class="mb-4">
      <ZoomToggle v-model="zoomLevel" />
    </div>

    <!-- Filters (only shown in day view) -->
    <div v-if="zoomLevel === 'day'" class="mb-6">
      <TimelineHeader
        v-model="searchQuery"
        v-model:category="selectedCategory"
        v-model:time-range="selectedTimeRange"
      />

      <!-- Active filter breadcrumb if coming from month/week zoom -->
      <div
        v-if="activeFilterLabel"
        class="mt-3 flex items-center gap-2 text-sm"
      >
        <span class="text-stone-500 dark:text-stone-400">Viewing:</span>
        <span class="font-medium text-stone-700 dark:text-stone-200">
          {{ activeFilterLabel }}
        </span>
        <button
          type="button"
          class="text-tada-600 dark:text-tada-400 hover:underline"
          @click="clearFilter"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Content based on zoom level -->
    <Transition
      mode="out-in"
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <!-- Year View -->
      <YearView
        v-if="zoomLevel === 'year'"
        :key="'year'"
        @zoom-to-year="handleZoomToYear"
      />

      <!-- Month View -->
      <MonthView
        v-else-if="zoomLevel === 'month'"
        :key="'month-' + selectedYear"
        :year="selectedYear"
        @zoom-to-month="handleZoomToMonth"
        @back="handleBackFromMonth"
      />

      <!-- Week View -->
      <WeekView
        v-else-if="zoomLevel === 'week'"
        :key="'week'"
        @zoom-to-week="handleZoomToWeek"
      />

      <!-- Day View (Virtual Timeline) -->
      <VirtualTimeline
        v-else
        :key="'day-' + selectedMonth + '-' + selectedWeek"
        :category="selectedCategory"
        :time-range="
          selectedMonth || selectedWeek ? 'custom' : selectedTimeRange
        "
        :search="debouncedSearch"
        :from-date="customDateRange.from"
        :to-date="customDateRange.to"
      />
    </Transition>
  </div>
</template>
