<script setup lang="ts">
// Journal page - dream journaling and free-form entries
import type { Entry } from "~/server/db/schema";
import { getEntryDisplayProps } from "~/utils/categoryDefaults";

definePageMeta({
  layout: "default",
});

// Fetch journal entries from API
const entries = ref<Entry[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const selectedFilter = ref<string>("all");

// Emoji picker state
const showEmojiPicker = ref(false);
const emojiPickerEntry = ref<Entry | null>(null);
const isUpdating = ref(false);

// Filter options based on subcategory (journals only - tada has its own page)
const filterOptions = [
  { value: "all", label: "All", emoji: "📖" },
  { value: "dream", label: "Dreams", emoji: "🌙" },
  { value: "gratitude", label: "Gratitude", emoji: "🙏" },
  { value: "note", label: "Notes", emoji: "📝" },
];

onMounted(async () => {
  try {
    // Fetch journal-type entries (type: journal only, not tada)
    // @ts-expect-error - Nuxt's $fetch typing causes excessive stack depth with complex routes
    const data: Entry[] = await $fetch("/api/entries");
    entries.value = data.filter(
      (e) =>
        e.type === "journal" ||
        // Legacy support for old type values
        ["dream", "note", "gratitude"].includes(e.type)
    );
  } catch (err: unknown) {
    console.error("Failed to fetch journal entries:", err);
    error.value = err instanceof Error ? err.message : "Failed to load entries";
  } finally {
    isLoading.value = false;
  }
});

const filteredEntries = computed(() => {
  if (selectedFilter.value === "all") return entries.value;

  // Filter by subcategory (dream, note, gratitude, etc.)
  return entries.value.filter(
    (e) =>
      e.subcategory === selectedFilter.value ||
      // Legacy support
      e.type === selectedFilter.value
  );
});

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Get display properties for an entry
function getDisplayProps(entry: Entry) {
  return getEntryDisplayProps({
    emoji: entry.emoji,
    category: entry.category,
    subcategory: entry.subcategory,
  });
}

// Show emoji picker for an entry
function openEmojiPicker(entry: Entry, event: Event) {
  event.preventDefault();
  event.stopPropagation();
  emojiPickerEntry.value = entry;
  showEmojiPicker.value = true;
}

// Update entry emoji
async function updateEmoji(emoji: string) {
  if (!emojiPickerEntry.value) return;

  const entry = emojiPickerEntry.value;
  isUpdating.value = true;

  try {
    await $fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      body: { emoji },
    });

    // Update local state
    entry.emoji = emoji;
  } catch (err: unknown) {
    console.error("Failed to update emoji:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    alert(`Failed to update emoji: ${message}`);
  } finally {
    isUpdating.value = false;
    emojiPickerEntry.value = null;
  }
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
          Journal
        </h1>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Dreams, notes & accomplishments
        </p>
      </div>

      <!-- Add entry button -->
      <NuxtLink
        to="/add?type=journal"
        class="flex items-center gap-2 px-4 py-2 bg-tada-600 hover:bg-tada-700 text-white rounded-lg font-medium transition-colors shadow-sm"
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
        <span class="hidden sm:inline">New Entry</span>
      </NuxtLink>
    </div>

    <!-- Type filter -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        v-for="option in filterOptions"
        :key="option.value"
        class="px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors"
        :class="
          selectedFilter === option.value
            ? 'bg-tada-600 text-white'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
        "
        @click="selectedFilter = option.value"
      >
        {{ option.emoji }} {{ option.label }}
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-tada-600 border-t-transparent"
      />
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredEntries.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">📖</div>
      <h2 class="text-xl font-semibold text-stone-700 dark:text-stone-200 mb-2">
        No entries yet
      </h2>
      <p class="text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
        Capture your dreams, celebrate your accomplishments, or jot down
        thoughts.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <NuxtLink
          to="/add?type=dream"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
        >
          🌙 Record a dream
        </NuxtLink>
        <NuxtLink
          to="/add?type=note"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-tada-600 hover:bg-tada-700 text-white rounded-lg font-medium transition-colors"
        >
          📝 Write a note
        </NuxtLink>
      </div>
    </div>

    <!-- Entries list -->
    <div v-else class="space-y-4">
      <NuxtLink
        v-for="entry in filteredEntries"
        :key="entry.id"
        :to="`/entry/${entry.id}`"
        class="block bg-white dark:bg-stone-800 rounded-xl p-4 shadow-sm border border-stone-200 dark:border-stone-700 hover:border-tada-300 dark:hover:border-tada-600 transition-colors"
      >
        <div class="flex items-start gap-3">
          <!-- Entry emoji with category color (clickable) -->
          <button
            class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:scale-110 transition-transform cursor-pointer"
            :style="{
              backgroundColor: getDisplayProps(entry).color + '20',
              color: getDisplayProps(entry).color,
            }"
            @click="openEmojiPicker(entry, $event)"
            title="Change emoji"
          >
            {{ getDisplayProps(entry).emoji }}
          </button>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3
                class="font-medium text-stone-800 dark:text-stone-100 truncate"
              >
                {{ entry.name }}
              </h3>
              <span
                class="text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap"
              >
                {{
                  formatDate(
                    entry.timestamp ||
                      entry.startedAt ||
                      entry.date ||
                      entry.createdAt
                  )
                }}
              </span>
            </div>
            <p
              v-if="entry.notes"
              class="text-sm text-stone-600 dark:text-stone-300 line-clamp-2"
            >
              {{ entry.notes }}
            </p>

            <!-- Dream-specific metadata -->
            <div
              v-if="
                entry.type === 'dream' &&
                entry.data &&
                typeof entry.data === 'object'
              "
              class="flex gap-2 mt-2"
            >
              <span
                v-if="'lucid' in entry.data && entry.data['lucid']"
                class="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
              >
                Lucid
              </span>
              <span
                v-if="'vivid' in entry.data && entry.data['vivid']"
                class="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
              >
                Vivid: {{ entry.data["vivid"] }}/5
              </span>
            </div>
          </div>

          <!-- Arrow -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-stone-400 flex-shrink-0"
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
        </div>
      </NuxtLink>
    </div>

    <!-- Emoji Picker Component -->
    <EmojiPicker
      v-model="showEmojiPicker"
      :entry-name="emojiPickerEntry?.name"
      @select="updateEmoji"
    />
  </div>
</template>
