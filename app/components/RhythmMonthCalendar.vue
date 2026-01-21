<template>
  <div class="rhythm-month-calendar">
    <!-- Month header -->
    <div class="mb-3 flex items-center justify-between">
      <button
        class="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300"
        @click="previousMonth"
      >
        <svg
          class="h-5 w-5"
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

      <h4 class="text-sm font-medium text-stone-700 dark:text-stone-300">
        {{ monthLabel }}
      </h4>

      <button
        class="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300"
        :disabled="isCurrentMonth"
        :class="{ 'opacity-30 cursor-not-allowed': isCurrentMonth }"
        @click="nextMonth"
      >
        <svg
          class="h-5 w-5"
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

    <!-- Calendar grid -->
    <div class="calendar-grid">
      <!-- Weekday headers -->
      <div
        v-for="dayName in weekdayLabels"
        :key="dayName"
        class="weekday-header"
      >
        {{ dayName }}
      </div>

      <!-- Calendar days -->
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        class="calendar-day"
        :class="getDayClasses(day)"
        :title="getDayTooltip(day)"
      >
        <span v-if="day.inMonth" class="day-number">{{ day.dayNum }}</span>
      </div>
    </div>

    <!-- Legend and Summary -->
    <div class="mt-3 flex items-center justify-between">
      <div class="flex items-center gap-1 text-xs text-stone-400">
        <span>Less</span>
        <div class="flex gap-0.5">
          <div
            v-for="level in [0, 1, 2, 3, 4]"
            :key="level"
            class="h-3 w-3 rounded-sm"
            :class="getLegendClass(level)"
          />
        </div>
        <span>More</span>
      </div>
      <div class="text-xs text-stone-500 dark:text-stone-400">
        {{ completedDays }}/{{ totalDaysInMonth }} days
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface DayStatus {
  date: string;
  totalSeconds: number;
  isComplete: boolean;
  entryCount: number;
}

interface CalendarDay {
  date: Date;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  isComplete: boolean;
  totalSeconds: number;
  intensityLevel: number;
}

const props = defineProps<{
  days: DayStatus[];
  thresholdSeconds?: number;
}>();

// Current displayed month
const displayMonth = ref(new Date().getMonth());
const displayYear = ref(new Date().getFullYear());

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

// Computed properties
const monthLabel = computed(() => {
  const date = new Date(displayYear.value, displayMonth.value);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
});

const isCurrentMonth = computed(() => {
  const now = new Date();
  return (
    displayMonth.value === now.getMonth() &&
    displayYear.value === now.getFullYear()
  );
});

const totalDaysInMonth = computed(() => {
  return new Date(displayYear.value, displayMonth.value + 1, 0).getDate();
});

const completedDays = computed(() => {
  return calendarDays.value.filter((d) => d.inMonth && d.isComplete).length;
});

// Create day map for lookup
const dayMap = computed(() => {
  const map = new Map<string, DayStatus>();
  for (const day of props.days) {
    map.set(day.date, day);
  }
  return map;
});

// Generate calendar days
const calendarDays = computed(() => {
  const result: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // First day of the month
  const firstDay = new Date(displayYear.value, displayMonth.value, 1);
  const startDay = firstDay.getDay(); // 0 = Sunday

  // Last day of the month
  const lastDay = new Date(displayYear.value, displayMonth.value + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Days from previous month
  const prevMonth = new Date(displayYear.value, displayMonth.value, 0);
  const prevMonthDays = prevMonth.getDate();

  // Helper to calculate intensity level
  const getIntensityLevel = (seconds: number, isFuture: boolean): number => {
    if (isFuture || seconds === 0) return 0;
    const threshold = props.thresholdSeconds || 360;
    if (seconds < threshold * 0.5) return 1;
    if (seconds < threshold) return 2;
    if (seconds < threshold * 2) return 3;
    return 4;
  };

  // Add previous month's trailing days
  for (let i = startDay - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const date = new Date(displayYear.value, displayMonth.value - 1, dayNum);
    const dateKey = formatDateKey(date);
    const status = dayMap.value.get(dateKey);
    const isFuture = date > today;
    const totalSeconds = status?.totalSeconds ?? 0;

    result.push({
      date,
      dayNum,
      inMonth: false,
      isToday: false,
      isFuture,
      isComplete: status?.isComplete ?? false,
      totalSeconds,
      intensityLevel: getIntensityLevel(totalSeconds, isFuture),
    });
  }

  // Add current month's days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(displayYear.value, displayMonth.value, i);
    const dateKey = formatDateKey(date);
    const status = dayMap.value.get(dateKey);
    const isFuture = date > today;
    const totalSeconds = status?.totalSeconds ?? 0;

    result.push({
      date,
      dayNum: i,
      inMonth: true,
      isToday: date.getTime() === today.getTime(),
      isFuture,
      isComplete: status?.isComplete ?? false,
      totalSeconds,
      intensityLevel: getIntensityLevel(totalSeconds, isFuture),
    });
  }

  // Add next month's leading days (to complete 6 rows)
  const totalCells = 42; // 6 rows * 7 days
  const remaining = totalCells - result.length;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(displayYear.value, displayMonth.value + 1, i);
    const dateKey = formatDateKey(date);
    const status = dayMap.value.get(dateKey);
    const isFuture = date > today;
    const totalSeconds = status?.totalSeconds ?? 0;

    result.push({
      date,
      dayNum: i,
      inMonth: false,
      isToday: false,
      isFuture,
      isComplete: status?.isComplete ?? false,
      totalSeconds,
      intensityLevel: getIntensityLevel(totalSeconds, isFuture),
    });
  }

  return result;
});

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function previousMonth() {
  if (displayMonth.value === 0) {
    displayMonth.value = 11;
    displayYear.value--;
  } else {
    displayMonth.value--;
  }
}

function nextMonth() {
  if (displayMonth.value === 11) {
    displayMonth.value = 0;
    displayYear.value++;
  } else {
    displayMonth.value++;
  }
}

function getDayClasses(day: CalendarDay): string[] {
  const classes: string[] = [];

  if (!day.inMonth) {
    classes.push("out-of-month");
    return classes;
  }

  if (day.isToday) {
    classes.push("is-today");
  }

  if (day.isFuture) {
    classes.push("is-future");
    return classes;
  }

  // Intensity-based coloring (same as year tracker)
  const intensityClasses: Record<number, string> = {
    0: "intensity-0",
    1: "intensity-1",
    2: "intensity-2",
    3: "intensity-3",
    4: "intensity-4",
  };
  classes.push(intensityClasses[day.intensityLevel] || "intensity-0");

  return classes;
}

function getDayTooltip(day: CalendarDay): string {
  if (!day.inMonth || day.isFuture) return "";

  const dateStr = day.date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (day.totalSeconds === 0) {
    return `${dateStr}: No activity`;
  }

  const minutes = Math.round(day.totalSeconds / 60);
  return `${dateStr}: ${minutes} min`;
}

function getLegendClass(level: number): string {
  const classes: Record<number, string> = {
    0: "bg-stone-100 dark:bg-stone-700",
    1: "bg-green-100 dark:bg-green-900",
    2: "bg-green-300 dark:bg-green-700",
    3: "bg-green-500 dark:bg-green-500",
    4: "bg-green-700 dark:bg-green-300",
  };
  return classes[level] || classes[0];
}
</script>

<style scoped>
.rhythm-month-calendar {
  max-width: 280px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
}

.weekday-header {
  text-align: center;
  font-size: 0.625rem;
  font-weight: 500;
  color: #9ca3af;
  padding: 0.25rem 0;
}

.calendar-day {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  cursor: default;
  transition: transform 0.1s ease;
}

.calendar-day:hover {
  transform: scale(1.1);
}

.calendar-day.out-of-month {
  color: #d1d5db;
  background: transparent;
}

.calendar-day.is-today {
  outline: 2px solid #f59e0b;
  outline-offset: -1px;
}

.calendar-day.is-future {
  color: #9ca3af;
  background: #fafafa;
}

/* Intensity levels - light mode */
.calendar-day.intensity-0 {
  background: #f5f5f4; /* stone-100 */
  color: #78716c;
}

.calendar-day.intensity-1 {
  background: #dcfce7; /* green-100 */
  color: #166534;
}

.calendar-day.intensity-2 {
  background: #86efac; /* green-300 */
  color: #166534;
}

.calendar-day.intensity-3 {
  background: #22c55e; /* green-500 */
  color: white;
}

.calendar-day.intensity-4 {
  background: #15803d; /* green-700 */
  color: white;
}

.day-number {
  z-index: 1;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .weekday-header {
    color: #6b7280;
  }

  .calendar-day.out-of-month {
    color: #4b5563;
    background: transparent;
  }

  .calendar-day.is-future {
    color: #6b7280;
    background: #1f2937;
  }

  .calendar-day.intensity-0 {
    background: #44403c; /* stone-700 */
    color: #a8a29e;
  }

  .calendar-day.intensity-1 {
    background: #14532d; /* green-900 */
    color: #bbf7d0;
  }

  .calendar-day.intensity-2 {
    background: #15803d; /* green-700 */
    color: #dcfce7;
  }

  .calendar-day.intensity-3 {
    background: #22c55e; /* green-500 */
    color: white;
  }

  .calendar-day.intensity-4 {
    background: #86efac; /* green-300 */
    color: #14532d;
  }
}
</style>
