<script setup lang="ts">
// Moments page - dreams, notes, magic moments, and freeform entries
import type { Entry } from "~/server/db/schema";

definePageMeta({
  layout: "default",
});

const router = useRouter();
const toast = useToast();
const { createEntry, isLoading: isSaving } = useEntryEngine();

// Voice input subcategory
const voiceSubcategory = ref<"magic" | "journal" | "dream" | "gratitude">("journal");

// Fetch journal entries from API
const entries = ref<Entry[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const selectedType = ref<"all" | "dream" | "magic" | "journal" | "gratitude">(
  "all",
);

// Navigate to entry only if no text was selected
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

onMounted(async () => {
  try {
    // Fetch moment-type entries (journal subcategories)
    const data = await $fetch<{
      entries: Entry[];
      nextCursor: string | null;
      hasMore: boolean;
    }>("/api/entries");
    entries.value = data.entries.filter(
      (e) =>
        [
          "dream",
          "journal",
          "note", // backward compat for old data
          "gratitude",
          "magic",
          "reflection",
          "memory",
        ].includes(e.type) ||
        e.category === "moments" ||
        e.subcategory === "journal",
    );
  } catch (err: unknown) {
    console.error("Failed to fetch moment entries:", err);
    error.value = err instanceof Error ? err.message : "Failed to load entries";
  } finally {
    isLoading.value = false;
  }
});

const filteredEntries = computed(() => {
  if (selectedType.value === "all") return entries.value;
  return entries.value.filter(
    (e) =>
      e.type === selectedType.value || e.subcategory === selectedType.value,
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

function getTypeIcon(type: string, subcategory?: string | null): string {
  const sub = subcategory || type;
  switch (sub) {
    case "dream":
      return "🌙";
    case "magic":
      return "🪄";
    case "gratitude":
      return "🙏";
    case "reflection":
      return "💭";
    case "memory":
      return "📸";
    case "journal":
    case "note": // backward compat
      return "🪶";
    default:
      return "✨";
  }
}

// Voice input handlers
async function handleVoiceComplete(
  _blob: Blob,
  _duration: number,
  transcription: string,
) {
  if (!transcription?.trim()) {
    toast.error("No speech detected. Please try again.");
    return;
  }

  try {
    // Extract first sentence as title, rest as notes
    const text = transcription.trim();
    const firstSentenceMatch = text.match(/^([^.!?]+[.!?]?)\s*/);
    let title = text;
    let notes = "";

    if (firstSentenceMatch && firstSentenceMatch[1]) {
      const firstPart = firstSentenceMatch[1].trim();
      const rest = text.slice(firstSentenceMatch[0].length).trim();

      if (firstPart.length <= 60) {
        title = firstPart;
        notes = rest;
      }
    }

    // Create moment entry
    const result = await createEntry({
      type: "moment",
      subcategory: voiceSubcategory.value,
      name: title,
      notes: notes || undefined,
      emoji: getTypeIcon(voiceSubcategory.value),
      timestamp: new Date().toISOString(),
      data: {
        source: "voice",
      },
    });

    if (result) {
      toast.success(`${voiceSubcategory.value === "magic" ? "🪄 Magic moment" : "📝 Moment"} saved!`);
      // Refresh entries
      try {
        const data = await $fetch<{
          entries: Entry[];
          nextCursor: string | null;
          hasMore: boolean;
        }>("/api/entries");
        entries.value = data.entries.filter(
          (e) =>
            [
              "dream",
              "journal",
              "note",
              "gratitude",
              "magic",
              "reflection",
              "memory",
              "moment",
            ].includes(e.type) ||
            e.category === "moments" ||
            e.subcategory === "journal",
        );
      } catch {
        // Silent refresh failure
      }
    }
  } catch (err) {
    console.error("Failed to save voice moment:", err);
    toast.error("Failed to save moment");
  }
}

function handleVoiceError(message: string) {
  toast.error(message);
}

function handleVoiceCancel() {
  // No need to hide anything - voice section is always visible
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
          Moments
        </h1>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Dreams, magic & reflections
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Quick text entry button -->
        <NuxtLink
          to="/add?type=moment"
          class="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-lg font-medium transition-colors shadow-sm"
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
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <span class="hidden sm:inline">Write</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Voice Input Section (always visible at top) -->
    <div
      class="mb-6 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 dark:border-purple-800 dark:from-purple-900/20 dark:to-indigo-900/20"
    >
      <div class="mb-4 text-center">
        <h3 class="text-lg font-semibold text-stone-800 dark:text-stone-100">
          Quick Voice Capture
        </h3>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Speak your thought, dream, or moment
        </p>
      </div>

      <!-- Type selector -->
      <div class="flex justify-center gap-2 mb-4">
        <button
          v-for="type in [
            { value: 'magic', label: '🪄 Magic', color: 'purple' },
            { value: 'dream', label: '🌙 Dream', color: 'indigo' },
            { value: 'gratitude', label: '🙏 Gratitude', color: 'amber' },
            { value: 'journal', label: '🪶 Journal', color: 'stone' },
          ]"
          :key="type.value"
          type="button"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
          :class="
            voiceSubcategory === type.value
              ? 'bg-' + type.color + '-500 text-white'
              : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
          "
          @click="voiceSubcategory = type.value as any"
        >
          {{ type.label }}
        </button>
      </div>

      <div class="flex justify-center">
        <VoiceRecorder
          mode="journal"
          @complete="handleVoiceComplete"
          @error="handleVoiceError"
          @cancel="handleVoiceCancel"
        />
      </div>

      <!-- Saving indicator -->
      <div
        v-if="isSaving"
        class="mt-4 flex items-center justify-center gap-2 text-stone-500 dark:text-stone-400"
      >
        <div
          class="h-4 w-4 animate-spin rounded-full border-2 border-tada-500 border-t-transparent"
        />
        <span class="text-sm">Saving...</span>
      </div>
    </div>

    <!-- Quick capture buttons (informational/shortcuts to type) -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
      <button
        type="button"
        class="flex items-center gap-2 px-3 py-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors"
        @click="voiceSubcategory = 'magic'"
      >
        <span class="text-xl">🪄</span>
        <span class="text-sm font-medium text-purple-700 dark:text-purple-300"
          >Magic</span
        >
      </button>
      <button
        type="button"
        class="flex items-center gap-2 px-3 py-3 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
        @click="voiceSubcategory = 'dream'"
      >
        <span class="text-xl">🌙</span>
        <span class="text-sm font-medium text-indigo-700 dark:text-indigo-300"
          >Dream</span
        >
      </button>
      <button
        type="button"
        class="flex items-center gap-2 px-3 py-3 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors"
        @click="voiceSubcategory = 'gratitude'"
      >
        <span class="text-xl">🙏</span>
        <span class="text-sm font-medium text-amber-700 dark:text-amber-300"
          >Gratitude</span
        >
      </button>
      <button
        type="button"
        class="flex items-center gap-2 px-3 py-3 bg-stone-50 dark:bg-stone-900/20 hover:bg-stone-100 dark:hover:bg-stone-900/30 rounded-lg border border-stone-200 dark:border-stone-800 transition-colors"
        @click="voiceSubcategory = 'journal'"
      >
        <span class="text-xl">🪶</span>
        <span class="text-sm font-medium text-stone-700 dark:text-stone-300"
          >Journal</span
        >
      </button>
    </div>

    <!-- Type filter -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        v-for="type in ['all', 'magic', 'dream', 'gratitude', 'journal']"
        :key="type"
        class="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
        :class="
          selectedType === type
            ? 'bg-tada-600 text-black dark:bg-tada-600 dark:text-white'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
        "
        @click="selectedType = type as any"
      >
        <span v-if="type === 'all'">All</span>
        <span v-else-if="type === 'magic'">🪄 Magic</span>
        <span v-else-if="type === 'dream'">🌙 Dreams</span>
        <span v-else-if="type === 'gratitude'">🙏 Gratitude</span>
        <span v-else>🪶 Journal</span>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-tada-300 border-t-transparent dark:border-tada-600"
      />
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredEntries.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">✨</div>
      <h2 class="text-xl font-semibold text-stone-700 dark:text-stone-200 mb-2">
        No moments yet
      </h2>
      <p class="text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
        Capture magic moments, record dreams, practice gratitude, or jot down
        thoughts.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
          @click="voiceSubcategory = 'magic'"
        >
          🪄 Capture magic
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
          @click="voiceSubcategory = 'dream'"
        >
          🌙 Record a dream
        </button>
      </div>
    </div>

    <!-- Entries list -->
    <div v-else class="space-y-3">
      <div
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="bg-white dark:bg-stone-800 rounded-xl p-4 shadow-sm border border-stone-200 dark:border-stone-700 hover:border-tada-300 dark:hover:border-tada-600 transition-colors cursor-pointer"
        @click="handleEntryClick(entry, $event)"
      >
        <div class="flex items-start gap-3">
          <!-- Type icon -->
          <div
            class="flex-shrink-0 w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-xl"
          >
            {{ getTypeIcon(entry.type, entry.subcategory) }}
          </div>

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
                {{ formatDate(entry.timestamp) }}
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
      </div>
    </div>
  </div>
</template>
