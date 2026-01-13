<script setup lang="ts">
// Habits page - Seinfeld method streak tracking
import type { Habit } from "~/server/db/schema";

definePageMeta({
  layout: "default",
});

// Extended habit with UI-specific fields
interface HabitWithUI extends Habit {
  completedToday: boolean;
  emoji: string;
}

// Fetch habits from API
const habits = ref<HabitWithUI[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    // TODO: Create habits API endpoint in Phase 2
    // For now, show placeholder that Phase 2 is needed
    habits.value = [];
  } catch (err: unknown) {
    console.error("Failed to fetch habits:", err);
    error.value = err instanceof Error ? err.message : "Failed to load habits";
  } finally {
    isLoading.value = false;
  }
});

// Get the last 7 days for the mini calendar
function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      date,
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
      dayNum: date.getDate(),
      isToday: i === 0,
    });
  }
  return days;
}

const last7Days = getLast7Days();
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
          Habits
        </h1>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Don't break the chain
        </p>
      </div>

      <!-- Add habit button -->
      <button
        class="flex items-center gap-2 px-4 py-2 bg-tada-600 hover:opacity-90 text-black dark:bg-tada-600 dark:text-white rounded-lg font-medium transition-colors shadow-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span class="hidden sm:inline">New Habit</span>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-tada-300 border-t-transparent dark:border-tada-600"
      />
    </div>

    <!-- Empty state -->
    <div v-else-if="habits.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">📊</div>
      <h2 class="text-xl font-semibold text-stone-700 dark:text-stone-200 mb-2">
        No habits yet
      </h2>
      <p class="text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
        Create habits to track with the Seinfeld method. Each day you complete
        the habit, you add a link to your chain.
      </p>
      <button
        class="inline-flex items-center gap-2 px-4 py-2 bg-tada-600 hover:opacity-90 text-black dark:bg-tada-600 dark:text-white rounded-lg font-medium transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Create your first habit
      </button>
    </div>

    <!-- Habits list -->
    <div v-else class="space-y-4">
      <div
        v-for="habit in habits"
        :key="habit.id"
        class="bg-white dark:bg-stone-800 rounded-xl p-4 shadow-sm border border-stone-200 dark:border-stone-700"
      >
        <div class="flex items-start gap-4">
          <!-- Emoji and completion toggle -->
          <button
            class="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors"
            :class="
              habit.completedToday
                ? 'bg-tada-100/30 dark:bg-tada-600/20'
                : 'bg-stone-100 dark:bg-stone-700'
            "
          >
            {{ habit.emoji }}
          </button>

          <!-- Habit info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-medium text-stone-800 dark:text-stone-100">
                {{ habit.name }}
              </h3>
              <span
                v-if="habit.completedToday"
                class="text-xs px-2 py-0.5 rounded-full bg-tada-100/30 text-tada-700 dark:bg-tada-600/20 dark:text-tada-300"
              >
                Done
              </span>
            </div>

            <!-- Streak info -->
            <div
              class="flex items-center gap-4 text-sm text-stone-500 dark:text-stone-400"
            >
              <span class="flex items-center gap-1">
                🔥 {{ habit.currentStreak }} day streak
              </span>
              <span class="flex items-center gap-1">
                🏆 Best: {{ habit.longestStreak }}
              </span>
            </div>

            <!-- Mini calendar (last 7 days) -->
            <div class="flex gap-1 mt-3">
              <div
                v-for="day in last7Days"
                :key="day.date.toISOString()"
                class="flex flex-col items-center"
              >
                <span class="text-xs text-stone-400 dark:text-stone-500 mb-1">
                  {{ day.dayName }}
                </span>
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors"
                  :class="[
                    day.isToday
                      ? 'ring-2 ring-tada-500 dark:ring-tada-500'
                      : '',
                    habit.completedToday && day.isToday
                      ? 'bg-tada-600 text-black dark:bg-tada-600 dark:text-white'
                      : Math.random() > 0.3 && !day.isToday
                      ? 'bg-tada-600 text-black dark:bg-tada-600 dark:text-white'
                      : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400',
                  ]"
                >
                  {{ day.dayNum }}
                </div>
              </div>
            </div>
          </div>

          <!-- Quick complete button -->
          <button
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            :class="
              habit.completedToday
                ? 'bg-tada-600 text-black dark:bg-tada-600 dark:text-white'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:bg-tada-100/20 dark:hover:bg-tada-600/20 hover:text-tada-700 dark:hover:text-tada-300'
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
