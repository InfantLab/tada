<template>
  <div class="rhythm-bar-chart">
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
        <!-- Day label (show weekday initials) -->
        <span class="day-label" :class="{ 'is-today': day.isToday }">
          {{ day.dayInitial }}
        </span>
      </div>
    </div>

    <!-- Y-axis label -->
    <div class="y-label">
      {{ goalType === "duration" ? "min" : "#" }}
    </div>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-item">
        <div class="legend-swatch bg-stone-200 dark:bg-stone-600" />
        <span>Weekend</span>
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

interface ChartDay {
  date: string;
  value: number; // minutes or count
  heightPercent: number;
  isWeekend: boolean;
  isToday: boolean;
  dayInitial: string;
  isComplete: boolean;
}

const props = defineProps<{
  days: DayStatus[];
  goalType?: "duration" | "count"; // duration = minutes, count = moments
  thresholdSeconds?: number;
}>();

// Create a map for quick lookup
const dayMap = computed(() => {
  const map = new Map<string, DayStatus>();
  for (const day of props.days) {
    map.set(day.date, day);
  }
  return map;
});

// Generate last 28 days (4 weeks)
const chartDays = computed(() => {
  const result: ChartDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayInitials = ["S", "M", "T", "W", "T", "F", "S"];

  // Collect values first to find max
  const tempDays: Array<{
    date: string;
    dayOfWeek: number;
    isToday: boolean;
    status?: DayStatus;
  }> = [];

  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateKey(d);
    const status = dayMap.value.get(dateStr);
    tempDays.push({
      date: dateStr,
      dayOfWeek: d.getDay(),
      isToday: i === 0,
      status,
    });
  }

  // Find max value for scaling
  let maxValue = 1;
  for (const td of tempDays) {
    const val = getValue(td.status);
    if (val > maxValue) maxValue = val;
  }

  // Build chart days with height percentages
  for (const td of tempDays) {
    const value = getValue(td.status);
    result.push({
      date: td.date,
      value,
      heightPercent: (value / maxValue) * 100,
      isWeekend: td.dayOfWeek === 0 || td.dayOfWeek === 6,
      isToday: td.isToday,
      dayInitial: dayInitials[td.dayOfWeek] || "",
      isComplete: td.status?.isComplete ?? false,
    });
  }

  return result;
});

function getValue(status?: DayStatus): number {
  if (!status) return 0;
  if (props.goalType === "count") {
    return status.entryCount;
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

.legend {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.25rem;
  padding-right: 0.25rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.5rem;
  color: #9ca3af;
}

.legend-swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .day-label {
    color: #6b7280;
  }

  .day-label.is-today {
    color: #fbbf24;
  }

  .y-label {
    color: #6b7280;
  }

  .legend-item {
    color: #6b7280;
  }

  .bar-wrapper.weekend-day .bar-track {
    background: rgba(120, 113, 108, 0.25);
  }
}
</style>
