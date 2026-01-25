<template>
  <div class="rhythm-bar-chart">
    <!-- Navigation header -->
    <div class="mb-2 flex items-center justify-between">
      <button
        class="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300"
        @click.stop="previousPeriod"
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

      <span class="text-sm font-medium text-stone-700 dark:text-stone-300">
        {{ periodLabel }}
      </span>

      <button
        class="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300"
        :disabled="isCurrentPeriod"
        :class="{ 'opacity-30 cursor-not-allowed': isCurrentPeriod }"
        @click.stop="nextPeriod"
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

    <!-- Bars container -->
    <div class="bars-container">
      <div
        v-for="day in chartDays"
        :key="day.date"
        class="bar-wrapper"
        :class="{ 'weekend-day': day.isWeekend }"
      >
        <!-- Bar -->
        <div class="bar-track">
          <div
            class="bar-fill"
            :style="{ height: `${day.heightPercent}%` }"
            :class="getBarClass(day)"
            :title="getTooltip(day)"
          />
        </div>
        <!-- Day label (date number) -->
        <span class="day-label" :class="{ 'is-today': day.isToday }">
          {{ day.dayNum }}
        </span>
        <!-- Month indicator (show on 1st or first visible day of month) -->
        <span v-if="day.showMonthLabel" class="month-label">
          {{ day.monthLabel }}
        </span>
      </div>
    </div>

    <!-- Y-axis label -->
    <div class="y-label">
      {{ goalType === "duration" ? "min" : "#" }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface DayStatus {
  date: string;
  totalSeconds: number;
  totalCount?: number; // For reps-based rhythms
  isComplete: boolean;
  entryCount: number;
}

interface ChartDay {
  date: string;
  value: number; // minutes or count
  heightPercent: number;
  isWeekend: boolean;
  isToday: boolean;
  dayNum: number;
  showMonthLabel: boolean;
  monthLabel: string;
  isComplete: boolean;
}

const props = defineProps<{
  days: DayStatus[];
  goalType?: "duration" | "count"; // duration = minutes, count = reps
  thresholdSeconds?: number;
}>();

// Navigation offset (0 = current period, 1 = previous 28 days, etc.)
const periodOffset = ref(0);

// Navigation functions
function previousPeriod() {
  periodOffset.value++;
}

function nextPeriod() {
  if (periodOffset.value > 0) {
    periodOffset.value--;
  }
}

const isCurrentPeriod = computed(() => periodOffset.value === 0);

// Period label showing date range (includes year when viewing historical data)
const periodLabel = computed(() => {
  const today = new Date();
  const currentYear = today.getFullYear();

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - periodOffset.value * 28);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 27);

  // Include year if either date is not in the current year
  const needsYear =
    startDate.getFullYear() !== currentYear ||
    endDate.getFullYear() !== currentYear;

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(needsYear && { year: "numeric" }),
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

// Generate 28 days (4 weeks) based on offset
const chartDays = computed(() => {
  const result: ChartDay[] = [];
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  // Shift by offset periods
  baseDate.setDate(baseDate.getDate() - periodOffset.value * 28);

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

  // Collect values first to find max
  const tempDays: Array<{
    date: string;
    dayOfWeek: number;
    dayNum: number;
    month: number;
    year: number;
    isToday: boolean;
    status?: DayStatus;
  }> = [];

  const todayStr = formatDateKey(new Date());
  const currentYear = new Date().getFullYear();

  for (let i = 27; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateKey(d);
    const status = dayMap.value.get(dateStr);
    tempDays.push({
      date: dateStr,
      dayOfWeek: d.getDay(),
      dayNum: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
      isToday: dateStr === todayStr,
      status,
    });
  }

  // Check if any dates are from a different year (need to show year in labels)
  const hasHistoricalData = tempDays.some((td) => td.year !== currentYear);

  // Find max value for scaling
  let maxValue = 1;
  for (const td of tempDays) {
    const val = getValue(td.status);
    if (val > maxValue) maxValue = val;
  }

  // Track which months we've shown
  let lastMonth = -1;
  let lastYear = -1;

  // Build chart days with height percentages
  for (let idx = 0; idx < tempDays.length; idx++) {
    const td = tempDays[idx];
    if (!td) continue; // Guard for TypeScript

    const value = getValue(td.status);

    // Show month label on 1st of month or first day in the range
    const showMonthLabel =
      td.dayNum === 1 ||
      (idx === 0 && (lastMonth !== td.month || lastYear !== td.year));
    if (showMonthLabel) {
      lastMonth = td.month;
      lastYear = td.year;
    }

    // Include year in label if viewing historical data
    const monthLabel = hasHistoricalData
      ? `${monthNames[td.month]} '${String(td.year).slice(2)}`
      : monthNames[td.month] || "";

    result.push({
      date: td.date,
      value,
      heightPercent: (value / maxValue) * 100,
      isWeekend: td.dayOfWeek === 0 || td.dayOfWeek === 6,
      isToday: td.isToday,
      dayNum: td.dayNum,
      showMonthLabel,
      monthLabel,
      isComplete: td.status?.isComplete ?? false,
    });
  }

  return result;
});

function getValue(status?: DayStatus): number {
  if (!status) return 0;
  if (props.goalType === "count") {
    // For count mode, prefer totalCount (reps) if available, fall back to entryCount
    return status.totalCount ?? status.entryCount;
  }
  // Duration: return minutes
  return Math.round(status.totalSeconds / 60);
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getBarClass(day: ChartDay): string {
  if (day.value === 0) return "bg-stone-100 dark:bg-stone-700";
  if (day.isComplete) return "bg-green-500 dark:bg-green-500";
  return "bg-green-300 dark:bg-green-600";
}

function getTooltip(day: ChartDay): string {
  const date = new Date(day.date);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (props.goalType === "count") {
    return `${dateStr}: ${day.value} ${day.value === 1 ? "entry" : "entries"}`;
  }
  return `${dateStr}: ${day.value} min`;
}
</script>

<style scoped>
.rhythm-bar-chart {
  position: relative;
  padding-bottom: 1rem;
}

.bars-container {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 60px;
  padding-left: 0.5rem;
}

.bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.bar-wrapper.weekend-day .bar-track {
  background: rgba(120, 113, 108, 0.15);
}

.bar-track {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: flex-end;
  border-radius: 2px 2px 0 0;
  overflow: hidden;
}

.bar-fill {
  width: 100%;
  min-height: 2px;
  border-radius: 2px 2px 0 0;
  transition: height 0.2s ease;
}

.day-label {
  font-size: 0.5rem;
  color: #9ca3af;
  margin-top: 2px;
  line-height: 1;
}

.day-label.is-today {
  font-weight: 600;
  color: #f59e0b;
}

.month-label {
  font-size: 0.45rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-top: 1px;
  line-height: 1;
}

.y-label {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) rotate(-90deg);
  font-size: 0.5rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .day-label {
    color: #6b7280;
  }

  .day-label.is-today {
    color: #fbbf24;
  }

  .month-label {
    color: #9ca3af;
  }

  .y-label {
    color: #6b7280;
  }

  .bar-wrapper.weekend-day .bar-track {
    background: rgba(120, 113, 108, 0.25);
  }
}
</style>
