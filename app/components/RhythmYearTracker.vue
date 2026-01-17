<template>
  <div class="rhythm-year-tracker">
    <div class="mb-2 flex items-center justify-between">
      <h4 class="text-sm font-medium text-stone-600 dark:text-stone-400">
        {{ year }}
      </h4>
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

    <!-- Weeks grid (GitHub-style) -->
    <div class="tracker-grid">
      <!-- Month labels row -->
      <div class="month-labels">
        <span
          v-for="month in monthLabels"
          :key="month.name"
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
import { computed } from "vue";

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
  isOutOfRange: boolean;
}

const props = defineProps<{
  days: DayStatus[];
  year?: number;
  thresholdSeconds?: number;
}>();

const year = computed(() => props.year || new Date().getFullYear());
const intensityLevels = [0, 1, 2, 3, 4];

// Create a map for quick lookup
const dayMap = computed(() => {
  const map = new Map<string, DayStatus>();
  for (const day of props.days) {
    map.set(day.date, day);
  }
  return map;
});

// Calculate month labels with their week spans
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

  let currentMonth = -1;
  let weekCount = 0;

  for (const week of weeks.value) {
    // Get the month of the middle of the week
    const midDay = week[3] || week[0];
    if (midDay && !midDay.isOutOfRange) {
      const month = midDay.date.getMonth();
      if (month !== currentMonth) {
        if (currentMonth !== -1 && weekCount > 0) {
          labels.push({
            name: monthNames[currentMonth] || "",
            weeks: weekCount,
          });
        }
        currentMonth = month;
        weekCount = 1;
      } else {
        weekCount++;
      }
    }
  }

  // Add last month
  if (currentMonth !== -1 && weekCount > 0) {
    labels.push({ name: monthNames[currentMonth] || "", weeks: weekCount });
  }

  return labels;
});

// Build weeks grid (52-53 weeks)
const weeks = computed(() => {
  const result: DayData[][] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the first Sunday of the year (or last Sunday of previous year)
  const startDate = new Date(year.value, 0, 1);
  // Adjust to start on Sunday
  const startDay = startDate.getDay();
  if (startDay > 0) {
    startDate.setDate(startDate.getDate() - startDay);
  }

  // End on the last Saturday of the year (or first Saturday of next year)
  const endDate = new Date(year.value, 11, 31);
  const endDay = endDate.getDay();
  if (endDay < 6) {
    endDate.setDate(endDate.getDate() + (6 - endDay));
  }

  const currentDate = new Date(startDate);
  let currentWeek: DayData[] = [];

  while (currentDate <= endDate) {
    const dateStr = formatDateKey(currentDate);
    const status = dayMap.value.get(dateStr);
    const isCurrentYear = currentDate.getFullYear() === year.value;

    currentWeek.push({
      date: new Date(currentDate),
      status,
      isFuture: currentDate > today,
      isOutOfRange: !isCurrentYear,
    });

    // If it's Saturday (day 6), start a new week
    if (currentDate.getDay() === 6) {
      result.push(currentWeek);
      currentWeek = [];
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Push any remaining days
  if (currentWeek.length > 0) {
    result.push(currentWeek);
  }

  return result;
});

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getIntensityLevel(day: DayData): number {
  if (!day.status || day.isOutOfRange) return 0;
  if (day.isFuture) return 0;

  const seconds = day.status.totalSeconds;
  const threshold = props.thresholdSeconds || 360; // 6 min default

  if (seconds === 0) return 0;
  if (seconds < threshold * 0.5) return 1;
  if (seconds < threshold) return 2;
  if (seconds < threshold * 2) return 3;
  return 4;
}

function getIntensityClass(level: number): string {
  const classes = [
    "bg-stone-100 dark:bg-stone-700", // Level 0 - none
    "bg-green-100 dark:bg-green-900", // Level 1 - minimal
    "bg-green-300 dark:bg-green-700", // Level 2 - some
    "bg-green-500 dark:bg-green-500", // Level 3 - good
    "bg-green-700 dark:bg-green-300", // Level 4 - great
  ];
  return classes[level] || classes[0];
}

function getDayCellClass(day: DayData): string {
  if (day.isOutOfRange) return "bg-transparent";
  if (day.isFuture) return "bg-stone-50 dark:bg-stone-800";
  return getIntensityClass(getIntensityLevel(day));
}

function getDayTooltip(day: DayData): string {
  if (day.isOutOfRange || day.isFuture) return "";

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
