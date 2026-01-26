<script setup lang="ts">
/**
 * Tally page - Quick count/reps entry and history
 *
 * Features:
 * - Quick-add counter with +/- buttons
 * - Recent tally entries list
 * - Activity suggestions from history
 * - One-tap presets for common activities (user-editable)
 */
import type { Entry } from "~/server/db/schema";

definePageMeta({
  layout: "default",
});

const router = useRouter();
const toast = useToast();
const { createEntry, isLoading: isSaving } = useEntryEngine();
const { loadPreferences, getTallyPresets, addTallyPreset } = usePreferences();

// Form state
const activityName = ref("");
const count = ref(10);
const category = ref("movement"); // Default category for tallies
const emoji = ref<string | undefined>(undefined);
const notes = ref("");

// Recent tally entries
const entries = ref<Entry[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

// Activity presets (user-editable)
const activityPresets = ref<
  Array<{ name: string; category?: string; emoji?: string }>
>([]);

// Activity suggestions from history
const suggestions = ref<
  Array<{ name: string; category?: string; count: number }>
>([]);
const showSuggestions = ref(false);

// Common quick-add presets (user can customize later)
const quickPresets = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
];

// Fetch recent tally entries and suggestions
onMounted(async () => {
  await loadPreferences();
  activityPresets.value = getTallyPresets();
  await Promise.all([fetchEntries(), fetchSuggestions()]);
});

async function fetchEntries() {
  try {
    isLoading.value = true;
    const data = await $fetch<{
      entries: Entry[];
      nextCursor: string | null;
      hasMore: boolean;
    }>("/api/entries", {
      query: { type: "tally", limit: 20 },
    });
    entries.value = data.entries;
  } catch (err: unknown) {
    console.error("Failed to fetch tally entries:", err);
    error.value = err instanceof Error ? err.message : "Failed to load entries";
  } finally {
    isLoading.value = false;
  }
}

async function fetchSuggestions() {
  try {
    const response = await $fetch<{
      suggestions: Array<{ name: string; category?: string; count: number }>;
    }>("/api/activities/recent", {
      query: { type: "tally", limit: 8 },
    });
    suggestions.value = response.suggestions || [];
  } catch {
    // Suggestions are optional, don't show error
    suggestions.value = [];
  }
}

// Increment/decrement count
function incrementCount(amount: number) {
  count.value = Math.max(1, count.value + amount);
}

function setCount(value: number) {
  count.value = value;
}

// Select a preset activity
function selectPreset(preset: {
  name: string;
  category?: string;
  emoji?: string;
}) {
  activityName.value = preset.name;
  if (preset.category) {
    category.value = preset.category;
  }
  if (preset.emoji) {
    emoji.value = preset.emoji;
  }
}

// Select a suggestion from history
function selectSuggestion(suggestion: { name: string; category?: string }) {
  activityName.value = suggestion.name;
  if (suggestion.category) {
    category.value = suggestion.category;
  }
  showSuggestions.value = false;
}

// Hide suggestions with delay (for blur handling)
function hideSuggestions() {
  setTimeout(() => {
    showSuggestions.value = false;
  }, 150);
}

// Quick repeat from recent entry
function repeatEntry(entry: Entry) {
  activityName.value = entry.name;
  category.value = entry.category || "movement";
  emoji.value = entry.emoji || undefined;
  // Use the same count as before
  if (entry.data && typeof entry.data === "object" && "count" in entry.data) {
    count.value = Number(entry.data["count"]) || 10;
  }
}

// Check if current activity is already a preset
const isActivityAPreset = computed(() => {
  const name = activityName.value.trim();
  return activityPresets.value.some(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
});

// Save current activity as a new preset
async function saveAsPreset() {
  const name = activityName.value.trim();
  if (!name || isActivityAPreset.value) return;

  await addTallyPreset({
    name,
    category: category.value || "movement",
    emoji: emoji.value,
  });

  // Refresh presets
  activityPresets.value = getTallyPresets();
  toast.success(`"${name}" saved as preset!`);
}

// Save entry
async function handleSave() {
  if (!activityName.value.trim() || count.value < 1 || isSaving.value) return;

  try {
    const result = await createEntry({
      type: "tally",
      name: activityName.value.trim(),
      category: category.value.trim() || "movement",
      emoji: emoji.value,
      count: count.value,
      notes: notes.value.trim() || undefined,
      timestamp: new Date().toISOString(),
      data: {
        count: count.value,
      },
    });

    if (result) {
      toast.success(`Added ${count.value} ${activityName.value}!`);
      // Reset form
      activityName.value = "";
      notes.value = "";
      count.value = 10;
      emoji.value = undefined;
      category.value = "movement";
      // Refresh entries
      await fetchEntries();
    }
  } catch (err) {
    console.error("Failed to save tally:", err);
    toast.error("Failed to save entry");
  }
}

// Navigate to entry detail
function handleEntryClick(entry: Entry, event: MouseEvent) {
  const selection = window.getSelection();
  if (selection && selection.toString().trim().length > 0) {
    return;
  }
  if ((event.target as HTMLElement).closest("a, button")) {
    return;
  }
  router.push(`/entry/${entry.id}`);
}

// Format relative date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Get count from entry data
function getEntryCount(entry: Entry): number {
  if (entry.data && typeof entry.data === "object" && "count" in entry.data) {
    return Number(entry.data["count"]) || 0;
  }
  return 0;
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
        Tally
      </h1>
      <p class="text-sm text-stone-500 dark:text-stone-400">
        Track reps, counts & quick activities
      </p>
    </div>

    <!-- Quick Add Card -->
    <div
      class="bg-white dark:bg-stone-800 rounded-xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 mb-6"
    >
      <!-- Activity name input with autocomplete -->
      <div class="mb-4">
        <label
          for="activity"
          class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2"
        >
          Activity
        </label>
        <div class="relative">
          <input
            id="activity"
            v-model="activityName"
            type="text"
            placeholder="What did you do? (e.g., Pushups, Squats)"
            class="w-full px-4 py-3 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-tada-500 focus:border-transparent"
            autocomplete="off"
            @focus="showSuggestions = true"
            @blur="hideSuggestions"
          />

          <!-- Suggestions dropdown -->
          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div
              v-if="showSuggestions && suggestions.length > 0"
              class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-stone-700 rounded-lg shadow-lg border border-stone-200 dark:border-stone-600 overflow-hidden z-10"
            >
              <button
                v-for="suggestion in suggestions"
                :key="suggestion.name"
                type="button"
                class="w-full px-4 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 text-sm transition-colors"
                @click="selectSuggestion(suggestion)"
              >
                {{ suggestion.name }}
                <span
                  v-if="suggestion.category"
                  class="text-stone-400 dark:text-stone-500 ml-2"
                >
                  · {{ suggestion.category }}
                </span>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Activity preset buttons -->
        <div class="flex flex-wrap gap-2 mt-3">
          <button
            v-for="preset in activityPresets"
            :key="preset.name"
            type="button"
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1"
            :class="
              activityName === preset.name
                ? 'bg-tada-600 text-white'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
            "
            @click="selectPreset(preset)"
          >
            <span v-if="preset.emoji">{{ preset.emoji }}</span>
            <span>{{ preset.name }}</span>
          </button>
        </div>

        <!-- Save as preset option (when typing new activity) -->
        <button
          v-if="activityName.trim() && !isActivityAPreset"
          type="button"
          class="mt-2 text-xs text-tada-600 dark:text-tada-400 hover:underline flex items-center gap-1"
          @click="saveAsPreset"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3"
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
          Save "{{ activityName.trim() }}" as preset
        </button>
      </div>

      <!-- Count selector -->
      <div class="mb-4">
        <label
          class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2"
        >
          Count
        </label>
        <div class="flex items-center gap-4">
          <!-- Decrement -->
          <button
            type="button"
            class="w-12 h-12 rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 font-bold text-xl transition-colors"
            @click="incrementCount(-1)"
          >
            −
          </button>

          <!-- Count display/input -->
          <input
            v-model.number="count"
            type="number"
            min="1"
            class="flex-1 text-center text-4xl font-bold text-stone-800 dark:text-stone-100 bg-transparent border-b-2 border-stone-200 dark:border-stone-600 focus:border-tada-500 focus:outline-none py-2"
          />

          <!-- Increment -->
          <button
            type="button"
            class="w-12 h-12 rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 font-bold text-xl transition-colors"
            @click="incrementCount(1)"
          >
            +
          </button>
        </div>

        <!-- Quick presets -->
        <div class="flex gap-2 mt-3 justify-center">
          <button
            v-for="preset in quickPresets"
            :key="preset.value"
            type="button"
            class="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            :class="
              count === preset.value
                ? 'bg-tada-600 text-white'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
            "
            @click="setCount(preset.value)"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <!-- Optional notes -->
      <div class="mb-4">
        <label
          for="notes"
          class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2"
        >
          Notes <span class="text-stone-400">(optional)</span>
        </label>
        <input
          id="notes"
          v-model="notes"
          type="text"
          placeholder="Any details to add..."
          class="w-full px-4 py-2 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-tada-500 focus:border-transparent text-sm"
        />
      </div>

      <!-- Save button -->
      <button
        type="button"
        :disabled="!activityName.trim() || count < 1 || isSaving"
        class="w-full py-3 rounded-lg font-semibold text-lg transition-all transform"
        :class="
          activityName.trim() && count >= 1 && !isSaving
            ? 'bg-tada-600 hover:bg-tada-700 text-white hover:scale-[1.02]'
            : 'bg-stone-200 dark:bg-stone-700 text-stone-400 cursor-not-allowed'
        "
        @click="handleSave"
      >
        <span v-if="isSaving">Saving...</span>
        <span v-else>Add {{ count }} {{ activityName || "reps" }}</span>
      </button>
    </div>

    <!-- Recent entries -->
    <div>
      <h2 class="text-lg font-semibold text-stone-700 dark:text-stone-200 mb-3">
        Recent Tallies
      </h2>

      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <div
          class="animate-spin rounded-full h-8 w-8 border-2 border-tada-300 border-t-transparent dark:border-tada-600"
        />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="entries.length === 0"
        class="text-center py-12 bg-stone-50 dark:bg-stone-800/50 rounded-xl"
      >
        <div class="text-5xl mb-4">🔢</div>
        <h3 class="text-lg font-medium text-stone-700 dark:text-stone-200 mb-2">
          No tallies yet
        </h3>
        <p class="text-sm text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
          Add your first count above to start tracking reps, sets, or any
          counted activity.
        </p>
      </div>

      <!-- Entries list -->
      <div v-else class="space-y-2">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="flex items-center gap-3 bg-white dark:bg-stone-800 rounded-lg p-3 border border-stone-200 dark:border-stone-700 hover:border-tada-300 dark:hover:border-tada-600 transition-colors cursor-pointer"
          @click="handleEntryClick(entry, $event)"
        >
          <!-- Count badge -->
          <div
            class="flex-shrink-0 w-14 h-14 rounded-lg bg-tada-100 dark:bg-tada-900/30 flex items-center justify-center"
          >
            <span class="text-xl font-bold text-tada-700 dark:text-tada-300">
              {{ getEntryCount(entry) }}
            </span>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-stone-800 dark:text-stone-100 truncate">
              {{ entry.name }}
            </h3>
            <div
              class="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400"
            >
              <span>{{ formatDate(entry.timestamp) }}</span>
              <span v-if="entry.category" class="text-stone-400">·</span>
              <span v-if="entry.category">{{ entry.category }}</span>
            </div>
          </div>

          <!-- Quick repeat button -->
          <button
            type="button"
            class="flex-shrink-0 p-2 rounded-lg text-stone-400 hover:text-tada-600 hover:bg-tada-50 dark:hover:bg-tada-900/20 transition-colors"
            title="Add again"
            @click.stop="repeatEntry(entry)"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
