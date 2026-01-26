<script setup lang="ts">
// VirtualTimeline - Virtualized infinite-scrolling entry list
import type { Entry } from "~/server/db/schema";
import { getEntryDisplayProps } from "~/utils/categoryDefaults";

// Get usePreferences to check for custom emojis
const { getCustomEmoji, loadPreferences } = usePreferences();

// Timeline refresh trigger - reload when entries are created/updated
const { refreshKey } = useTimelineRefresh();

// Load preferences on mount (if not already loaded)
onMounted(() => {
  loadPreferences();
});

interface Props {
  category?: string;
  timeRange?: string;
  search?: string;
  fromDate?: string; // Custom date range override
  toDate?: string; // Custom date range override
}

const props = withDefaults(defineProps<Props>(), {
  category: "",
  timeRange: "all",
  search: "",
  fromDate: "",
  toDate: "",
});

const router = useRouter();
const entries = ref<Entry[]>([]);
const isLoading = ref(true);
const isLoadingMore = ref(false);
const error = ref<string | null>(null);
const nextCursor = ref<string | null>(null);
const hasMore = ref(true);

// Navigate to entry only if no text was selected
function handleEntryClick(entry: Entry, event: MouseEvent) {
  // Don't navigate if user selected text
  const selection = window.getSelection();
  if (selection && selection.toString().trim().length > 0) {
    return;
  }
  // Don't navigate if clicking a link or button inside
  if ((event.target as HTMLElement).closest("a, button")) {
    return;
  }
  router.push(`/entry/${entry.id}`);
}

// Calculate date range based on timeRange or custom props
function getDateRange(): { from?: string; to?: string } {
  // Use custom date range if provided
  if (props.fromDate || props.toDate) {
    return {
      from: props.fromDate || undefined,
      to: props.toDate || undefined,
    };
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (props.timeRange) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      startOfWeek.setDate(now.getDate() - diff);
      return { from: startOfWeek.toISOString().split("T")[0], to: today };
    }
    case "month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfMonth.toISOString().split("T")[0], to: today };
    }
    case "year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { from: startOfYear.toISOString().split("T")[0], to: today };
    }
    case "custom":
      // Custom range handled above
      return {};
    case "all":
    default:
      return {};
  }
}

// Fetch entries with current filters
async function fetchEntries(cursor?: string) {
  const { from, to } = getDateRange();

  const params = new URLSearchParams();
  params.set("limit", "50");
  if (cursor) params.set("cursor", cursor);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (props.category) params.set("category", props.category);
  if (props.search) params.set("search", props.search);

  const data = await $fetch<{
    entries: Entry[];
    nextCursor: string | null;
    hasMore: boolean;
  }>(`/api/entries?${params.toString()}`);
  return data;
}

// Initial load
async function loadInitial() {
  try {
    isLoading.value = true;
    error.value = null;
    entries.value = [];
    nextCursor.value = null;

    const data = await fetchEntries();
    entries.value = data.entries;
    nextCursor.value = data.nextCursor;
    hasMore.value = data.hasMore;
  } catch (err: unknown) {
    console.error("Failed to fetch entries:", err);
    error.value = err instanceof Error ? err.message : "Failed to load entries";
  } finally {
    isLoading.value = false;
  }
}

// Load more entries (infinite scroll)
async function loadMore() {
  if (isLoadingMore.value || !hasMore.value || !nextCursor.value) return;

  try {
    isLoadingMore.value = true;
    const data = await fetchEntries(nextCursor.value);
    entries.value = [...entries.value, ...data.entries];
    nextCursor.value = data.nextCursor;
    hasMore.value = data.hasMore;
  } catch (err: unknown) {
    console.error("Failed to load more entries:", err);
  } finally {
    isLoadingMore.value = false;
  }
}

// Reload when filters change
watch(
  () => [
    props.category,
    props.timeRange,
    props.search,
    props.fromDate,
    props.toDate,
  ],
  () => {
    loadInitial();
  },
);

// Reload when entries are created/updated elsewhere
watch(refreshKey, () => {
  loadInitial();
});

onMounted(loadInitial);

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

// Format duration with readable abbreviations
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    const hourStr = hours === 1 ? "1 hr" : `${hours} hrs`;
    if (mins === 0) return hourStr;
    const minStr = `${mins} min`;
    return `${hourStr} ${minStr}`;
  }
  if (mins > 0) {
    const minStr = `${mins} min`;
    if (secs === 0) return minStr;
    const secStr = `${secs} secs`;
    return `${minStr} ${secStr}`;
  }
  return secs === 1 ? "1 sec" : `${secs} secs`;
}

// Get count from tally entry data
function getTallyCount(entry: Entry): number | null {
  if (entry.type !== "tally") return null;
  if (entry.data && typeof entry.data === "object" && "count" in entry.data) {
    return Number(entry.data["count"]) || null;
  }
  return null;
}

// Get display title for entry (includes count for tally entries)
function getEntryTitle(entry: Entry): string {
  const count = getTallyCount(entry);
  if (count !== null) {
    return `${count} ${entry.name}`;
  }
  return entry.name;
}

// Get icon for entry type - checking custom emojis first
function getEntryEmoji(entry: Entry): string {
  // First check if entry has its own emoji
  if (entry.emoji) return entry.emoji;

  // Then check for custom emoji for subcategory (category:subcategory key)
  const category = entry.category || entry.type || "";
  const subcategory = entry.subcategory || "";
  if (category && subcategory) {
    const customSubcategoryEmoji = getCustomEmoji(`${category}:${subcategory}`);
    if (customSubcategoryEmoji) return customSubcategoryEmoji;
  }

  // Then check for custom emoji for category
  if (category) {
    const customCategoryEmoji = getCustomEmoji(category);
    if (customCategoryEmoji) return customCategoryEmoji;
  }

  // Fall back to default display props
  return getEntryDisplayProps(entry).emoji;
}

// Group entries by date
interface DateGroup {
  date: string;
  entries: Entry[];
}

const groupedEntries = computed<DateGroup[]>(() => {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries.value) {
    // timestamp is THE canonical timeline field - always set
    const ts = entry.timestamp;
    if (!ts) continue;
    const date = new Date(ts).toLocaleDateString();
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(entry);
  }
  return Array.from(groups.entries()).map(([date, entries]) => ({
    date,
    entries,
  }));
});

// Intersection observer for infinite scroll
const loadTrigger = ref<HTMLElement | null>(null);
const observer = ref<IntersectionObserver | null>(null);

// Setup observer when component mounts and loadTrigger is available
watch(loadTrigger, (el) => {
  // Cleanup old observer
  if (observer.value) {
    observer.value.disconnect();
    observer.value = null;
  }

  // Create new observer if element exists
  if (el) {
    observer.value = new IntersectionObserver(
      (observerEntries) => {
        if (
          observerEntries[0]?.isIntersecting &&
          hasMore.value &&
          !isLoadingMore.value
        ) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );
    observer.value.observe(el);
  }
});

onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect();
  }
});

// Expose for parent component
defineExpose({ loadInitial, entries });
</script>

<template>
  <div class="virtual-timeline">
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
        @click="loadInitial"
      >
        Try again
      </button>
    </div>

    <!-- Empty state -->
    <div v-else-if="entries.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">{{ search ? "🔍" : "⚡" }}</div>
      <h2 class="text-xl font-semibold text-stone-700 dark:text-stone-200 mb-2">
        {{ search ? "No matching entries" : "No entries yet" }}
      </h2>
      <p class="text-stone-500 dark:text-stone-400 max-w-md mx-auto">
        {{
          search
            ? "Try adjusting your search or filters"
            : "Start capturing moments from your life"
        }}
      </p>
    </div>

    <!-- Entries list -->
    <div v-else class="space-y-6">
      <div v-for="group in groupedEntries" :key="group.date">
        <h3
          class="text-sm font-medium text-stone-500 dark:text-stone-400 mb-3 sticky top-0 bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm py-1 z-10"
        >
          {{ group.date }}
        </h3>
        <div class="space-y-2">
          <div
            v-for="entry in group.entries"
            :key="entry.id"
            class="bg-white dark:bg-stone-800 rounded-lg p-4 shadow-sm border border-stone-200 dark:border-stone-700 hover:border-tada-300 dark:hover:border-tada-600 transition-colors cursor-pointer"
            @click="handleEntryClick(entry, $event)"
          >
            <div class="flex items-start gap-3">
              <!-- Entry type icon -->
              <div
                class="flex-shrink-0 w-10 h-10 rounded-full bg-tada-100/30 dark:bg-tada-600/20 flex items-center justify-center"
              >
                <span class="text-lg">{{ getEntryEmoji(entry) }}</span>
              </div>

              <!-- Entry content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <h4 class="font-semibold text-stone-800 dark:text-stone-100">
                    {{ getEntryTitle(entry) }}
                  </h4>
                  <span
                    class="text-xs text-stone-500 dark:text-stone-400 flex-shrink-0"
                  >
                    {{ formatRelativeTime(entry.timestamp) }}
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
                      v-for="tag in entry.tags.slice(0, 3)"
                      :key="tag"
                      class="text-xs bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded"
                    >
                      {{ tag }}
                    </span>
                    <span
                      v-if="entry.tags.length > 3"
                      class="text-xs text-stone-400"
                    >
                      +{{ entry.tags.length - 3 }}
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

      <!-- Load more trigger -->
      <div ref="loadTrigger" class="py-4">
        <div v-if="isLoadingMore" class="flex justify-center">
          <div
            class="animate-spin rounded-full h-6 w-6 border-2 border-tada-300 border-t-transparent dark:border-tada-600"
          />
        </div>
        <div v-else-if="hasMore" class="text-center">
          <button
            class="text-sm text-tada-600 dark:text-tada-400 hover:underline"
            @click="loadMore"
          >
            Load more
          </button>
        </div>
        <div v-else class="text-center text-sm text-stone-400">
          — End of timeline —
        </div>
      </div>
    </div>
  </div>
</template>
