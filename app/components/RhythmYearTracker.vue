<template>
  <div class="rhythm-year-tracker">
    <!-- Header with navigation -->
    <div class="mb-2 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button
          class="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300"
          @click="previousYear"
        >
          <svg
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
        </button>
        <h4 class="text-sm font-medium text-stone-600 dark:text-stone-400">
          {{ periodLabel }}
        </h4>
        <button
          class="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300"
          :disabled="isCurrentPeriod"
          :class="{ 'opacity-30 cursor-not-allowed': isCurrentPeriod }"
          @click="nextYear"
        >
          <svg
            class="h-4 w-4"
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
        </button>
      </div>
      <div
        class="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500"
      >
        <span>Less</span>
        <div class="flex gap-0.5">
          <div
            v-for="level in intensityLevels"
            :key="level"
            class="h-3 w-3 rounded-sm"
            :class="getIntensityClass(level)"
          />
        </div>
        <span>More</span>
      </div>
    </div>

    <!-- Weeks grid (GitHub-style, trailing 52 weeks) -->
    <div class="tracker-grid">
      <!-- Month labels row -->
      <div class="month-labels">
        <span
          v-for="(month, idx) in monthLabels"
          :key="`${month.name}-${idx}`"
          class="month-label"
          :style="{ gridColumn: `span ${month.weeks}` }"
        >
          {{ month.name }}
        </span>
      </div>

      <!-- Day rows (Mon-Sun) -->
      <div class="day-grid">
        <!-- Day of week labels -->
        <div class="day-labels">
          <span />
          <span class="day-label">Mon</span>
          <span />
          <span class="day-label">Wed</span>
          <span />
          <span class="day-label">Fri</span>
          <span />
        </div>

        <!-- Week columns with day cells -->
        <div class="weeks-container">
          <div
            v-for="(week, weekIndex) in weeks"
            :key="weekIndex"
            class="week-column"
          >
            <div
              v-for="(day, dayIndex) in week"
              :key="dayIndex"
              class="day-cell"
              :class="getDayCellClass(day)"
              :title="getDayTooltip(day)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

interface DayStatus {
  date: string;
  totalSeconds: number;
  isComplete: boolean;
  entryCount: number;
}

interface DayData {
  date: Date;
  status?: DayStatus;
  isFuture: boolean;
  isEmpty: boolean;
}

const props = defineProps<{
  days: DayStatus[];
  goalType?: "duration" | "count";
  thresholdSeconds?: number;
  thresholdCount?: number | null;
}>();

const intensityLevels = [0, 1, 2, 3, 4];

// Year offset (0 = current year, 1 = previous year, etc.)
const yearOffset = ref(0);

// Navigation functions
function previousYear() {
  yearOffset.value++;
}

function nextYear() {
  if (yearOffset.value > 0) {
    yearOffset.value--;
  }
}

const isCurrentPeriod = computed(() => yearOffset.value === 0);

// Period label showing date range
const periodLabel = computed(() => {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - yearOffset.value * 364);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 364);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
});

// Create a map for quick lookup
const dayMap = computed(() => {
  const map = new Map<string, DayStatus>();
  for (const day of props.days) {
    map.set(day.date, day);
  }
  return map;
});

// Build weeks grid - 53 weeks trailing back from end date (GitHub-style)
const weeks = computed(() => {
  const result: DayData[][] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate end date based on offset
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - yearOffset.value * 364);

  // Find the Sunday of the week containing 52 weeks before end date
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 364); // Go back ~52 weeks
  // Adjust to the previous Sunday
  const startDay = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDay);

  const currentDate = new Date(startDate);
  let currentWeek: DayData[] = [];

  while (currentDate <= endDate) {
    const dateStr = formatDateKey(currentDate);
    const status = dayMap.value.get(dateStr);

    currentWeek.push({
      date: new Date(currentDate),
      status,
      isFuture: currentDate > today,
      isEmpty: false,
    });

    // If it's Saturday (day 6), start a new week
    if (currentDate.getDay() === 6) {
      result.push(currentWeek);
      currentWeek = [];
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Push any remaining days (partial week at end)
  if (currentWeek.length > 0) {
    // Pad with empty cells if needed
    while (currentWeek.length < 7) {
      currentWeek.push({
        date: new Date(),
        status: undefined,
        isFuture: true,
        isEmpty: true,
      });
    }
    result.push(currentWeek);
  }

  return result;
});

// Calculate month labels with their week spans
// Month label appears at the week containing the 1st of that month
const monthLabels = computed(() => {
  const labels: { name: string; weeks: number }[] = [];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  if (weeks.value.length === 0) return labels;

  // Track which month each week "belongs" to for labeling
  // A week belongs to a month if it contains the 1st of that month,
  // OR if it's the first week and starts mid-month
  let currentMonth = -1;
  let weekCount = 0;

  for (let weekIdx = 0; weekIdx < weeks.value.length; weekIdx++) {
    const week = weeks.value[weekIdx];
    if (!week) continue; // Guard for TypeScript

    // Find if this week contains the 1st of any month
    let monthStart = -1;
    for (const day of week) {
      if (!day.isEmpty && day.date.getDate() === 1) {
        monthStart = day.date.getMonth();
        break;
      }
    }

    if (monthStart !== -1) {
      // This week contains a month start
      if (currentMonth !== -1 && weekCount > 0) {
        labels.push({
          name: monthNames[currentMonth] || "",
          weeks: weekCount,
        });
      }
      currentMonth = monthStart;
      weekCount = 1;
    } else if (weekIdx === 0) {
      // First week - use the first day's month
      const firstDay = week.find((d) => !d.isEmpty);
      if (firstDay) {
        currentMonth = firstDay.date.getMonth();
        weekCount = 1;
      }
    } else {
      // Continue counting for current month
      weekCount++;
    }
  }

  // Add last month
  if (currentMonth !== -1 && weekCount > 0) {
    labels.push({ name: monthNames[currentMonth] || "", weeks: weekCount });
  }

  return labels;
});

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getIntensityLevel(day: DayData): number {
  if (!day.status || day.isEmpty) return 0;
  if (day.isFuture) return 0;

  // Choose metric and threshold based on goal type
  const value =
    props.goalType === "count"
      ? day.status.totalCount || 0
      : day.status.totalSeconds;
  const threshold =
    props.goalType === "count"
      ? props.thresholdCount || 10 // 10 reps default
      : props.thresholdSeconds || 360; // 6 min default

  if (value === 0) return 0;
  if (value < threshold * 0.5) return 1;
  if (value < threshold) return 2;
  if (value < threshold * 2) return 3;
  return 4;
}

function getIntensityClass(level: number): string {
  const classes: string[] = [
    "bg-stone-100 dark:bg-stone-700", // Level 0 - none
    "bg-green-100 dark:bg-green-900", // Level 1 - minimal
    "bg-green-300 dark:bg-green-700", // Level 2 - some
    "bg-green-500 dark:bg-green-500", // Level 3 - good
    "bg-green-700 dark:bg-green-300", // Level 4 - great
  ];
  return classes[level] ?? classes[0] ?? "";
}

function getDayCellClass(day: DayData): string {
  if (day.isEmpty) return "bg-transparent";
  if (day.isFuture) return "bg-stone-50 dark:bg-stone-800";
  return getIntensityClass(getIntensityLevel(day));
}

function getDayTooltip(day: DayData): string {
  if (day.isEmpty || day.isFuture) return "";

  const dateStr = day.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (!day.status || day.status.totalSeconds === 0) {
    return `${dateStr}: No activity`;
  }

  const minutes = Math.round(day.status.totalSeconds / 60);
  const sessions = day.status.entryCount;
  return `${dateStr}: ${minutes} min (${sessions} ${sessions === 1 ? "session" : "sessions"})`;
}
</script>

<style scoped>
.rhythm-year-tracker {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

/* Ensure scrollbar is subtle */
.rhythm-year-tracker::-webkit-scrollbar {
  height: 4px;
}

.rhythm-year-tracker::-webkit-scrollbar-track {
  background: transparent;
}

.rhythm-year-tracker::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 2px;
}

.tracker-grid {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: fit-content;
}

.month-labels {
  display: flex;
  padding-left: 2rem; /* Space for day labels */
  font-size: 0.625rem;
  color: #9ca3af;
}

.month-label {
  text-align: left;
  padding-left: 0.25rem;
}

.day-grid {
  display: flex;
  gap: 0.25rem;
}

.day-labels {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 1.75rem;
  flex-shrink: 0;
}

.day-label {
  font-size: 0.625rem;
  color: #9ca3af;
  height: 0.625rem;
  line-height: 0.625rem;
}

.day-labels span {
  height: 0.625rem;
}

.weeks-container {
  display: flex;
  gap: 2px;
}

.week-column {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.day-cell {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 2px;
  transition: transform 0.1s ease;
}

.day-cell:hover {
  transform: scale(1.3);
}

@media (prefers-color-scheme: dark) {
  .month-label,
  .day-label {
    color: #6b7280;
  }
}
</style>
