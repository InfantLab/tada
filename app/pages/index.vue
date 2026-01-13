<script setup lang="ts">
// Timeline page - the main view showing all entries chronologically
import type { Entry } from "~/server/db/schema";

definePageMeta({
  layout: "default",
});

// Fetch entries from API
const entries = ref<Entry[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

async function fetchEntries() {
  try {
    isLoading.value = true;
    const data = await $fetch("/api/entries");
    entries.value = data as Entry[];
  } catch (err: unknown) {
    console.error("Failed to fetch entries:", err);
    error.value = err instanceof Error ? err.message : "Failed to load entries";
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchEntries);

// Format relative time
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Get icon for entry type
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    timed: "🧘",
    meditation: "🧘",
    dream: "🌙",
    tada: "⚡",
    journal: "📝",
    note: "📝",
    reps: "💪",
    gps_tracked: "🏃",
    measurement: "📊",
  };
  return icons[type] || "📌";
}

// Group entries by date
function groupByDate(entries: Entry[]): Map<string, Entry[]> {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    // Use timestamp as the source of truth (should always be present now)
    const ts = entry.timestamp;
    if (!ts) {
      console.warn("Entry missing timestamp:", entry);
      continue; // Skip entries without timestamp
    }
    const date = new Date(ts).toLocaleDateString();
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(entry);
  }
  return groups;
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
          Timeline
        </h1>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Your recent entries
        </p>
      </div>

      <!-- Quick add button -->
      <NuxtLink
        to="/add"
        class="flex items-center gap-2 px-4 py-2 bg-tada-600 hover:opacity-90 text-black rounded-lg font-medium transition-colors shadow-sm dark:bg-tada-600 dark:text-white"
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
        <span class="hidden sm:inline">Add Entry</span>
      </NuxtLink>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-tada-300 border-t-transparent dark:border-tada-600"
      />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-12">
      <div class="text-6xl mb-4">⚠️</div>
      <h2 class="text-xl font-semibold text-stone-700 dark:text-stone-200 mb-2">
        Failed to load entries
      </h2>
      <p class="text-stone-500 dark:text-stone-400 mb-4">{{ error }}</p>
      <button
        class="px-4 py-2 bg-tada-600 hover:opacity-90 text-black rounded-lg font-medium transition-colors dark:bg-tada-600 dark:text-white"
        @click="
          () => {
            isLoading = true;
            fetchEntries();
          }
        "
      >
        Try again
      </button>
    </div>

    <!-- Empty state -->
    <div v-else-if="entries.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">⚡</div>
      <h2 class="text-xl font-semibold text-stone-700 dark:text-stone-200 mb-2">
        Welcome to Ta-Da!
      </h2>
      <p class="text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
        Start capturing moments from your life. Meditations, accomplishments,
        dreams, habits — everything in one place.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <NuxtLink
          to="/timer"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-tada-600 hover:opacity-90 text-black rounded-lg font-medium transition-colors dark:bg-tada-600 dark:text-white"
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
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Start a timer
        </NuxtLink>
        <NuxtLink
          to="/add"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-lg font-medium transition-colors"
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
          Add an entry
        </NuxtLink>
      </div>
    </div>

    <!-- Entries list -->
    <div v-else class="space-y-6">
      <div v-for="[date, dayEntries] in groupByDate(entries)" :key="date">
        <h3 class="text-sm font-medium text-stone-500 dark:text-stone-400 mb-3">
          {{ date }}
        </h3>
        <div class="space-y-2">
          <div
            v-for="entry in dayEntries"
            :key="entry.id"
            class="bg-white dark:bg-stone-800 rounded-lg p-4 shadow-sm border border-stone-200 dark:border-stone-700"
          >
            <div class="flex items-start gap-3">
              <!-- Entry type icon -->
              <div
                class="flex-shrink-0 w-10 h-10 rounded-full bg-tada-100/30 dark:bg-tada-600/20 flex items-center justify-center"
              >
                <span class="text-lg">{{ getTypeIcon(entry.type) }}</span>
              </div>

              <!-- Entry content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <h4 class="font-semibold text-stone-800 dark:text-stone-100">
                    {{ entry.name }}
                  </h4>
                  <span
                    class="text-xs text-stone-500 dark:text-stone-400 flex-shrink-0"
                  >
                    {{
                      formatRelativeTime(
                        entry.timestamp ||
                          entry.startedAt ||
                          entry.date ||
                          entry.createdAt
                      )
                    }}
                  </span>
                </div>

                <!-- Entry metadata -->
                <div
                  class="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-300 mb-2"
                >
                  <span
                    v-if="entry.durationSeconds"
                    class="flex items-center gap-1"
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {{ formatDuration(entry.durationSeconds) }}
                  </span>
                  <span
                    v-if="entry.tags && entry.tags.length > 0"
                    class="flex items-center gap-1"
                  >
                    <span
                      v-for="tag in entry.tags"
                      :key="tag"
                      class="text-xs bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded"
                    >
                      {{ tag }}
                    </span>
                  </span>
                </div>

                <!-- Notes -->
                <p
                  v-if="entry.notes"
                  class="text-sm text-stone-600 dark:text-stone-300 line-clamp-2"
                >
                  {{ entry.notes }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
