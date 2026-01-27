<script setup lang="ts">
// Moments page - dreams, notes, magic moments, and freeform entries
import type { Entry } from "~/server/db/schema";
import type { ExtractedTada } from "~/types/extraction";

definePageMeta({
  layout: "default",
});

const router = useRouter();
const toast = useToast();
const { createEntry, isLoading: isSaving } = useEntryEngine();
const llmStructure = useLLMStructure();

// Voice UI state
const showVoicePanel = ref(false);
const isRecording = ref(false);

// Voice input subcategory
const voiceSubcategory = ref<"magic" | "journal" | "dream" | "gratitude">(
  "journal",
);

// Text input form state
const title = ref("");
const notes = ref("");
const notesTextarea = ref<HTMLTextAreaElement | null>(null);

// Extracted ta-das from voice
const extractedTadas = ref<ExtractedTada[]>([]);

// Celebration state
const showCelebration = ref(false);

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

// Get the user's preferred ta-da sound
function getTadaSoundFile(): string {
  try {
    const saved = localStorage.getItem("tada-settings");
    if (saved) {
      const settings = JSON.parse(saved);
      const soundMap: Record<string, string> = {
        "tada-short": "/sounds/tada-f-versionD.mp3",
        "tada-long": "/sounds/tada-f-versionA.mp3",
        twinkle: "/sounds/twinkle.mp3",
      };
      return soundMap[settings.tadaSound] || "/sounds/tada-f-versionD.mp3";
    }
  } catch {
    // Ignore errors
  }
  return "/sounds/tada-f-versionD.mp3";
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
    logError("moments.fetchEntries", err);
    error.value = getErrorMessage(err, "Failed to load entries");
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

/**
 * Smart split of transcribed text into title and notes
 * - Title: First sentence or first ~60 chars at a natural break
 * - Notes: Everything after the title
 */
function splitTitleAndNotes(text: string): { title: string; notes: string } {
  const trimmed = text.trim();

  if (trimmed.length <= 60) {
    // Short enough to be just a title
    return { title: trimmed, notes: "" };
  }

  // Try to find first sentence (ending with . ! ?)
  const sentenceMatch = trimmed.match(/^(.+?[.!?])\s+/);
  if (sentenceMatch && sentenceMatch[1].length <= 80) {
    return {
      title: sentenceMatch[1].trim(),
      notes: trimmed.slice(sentenceMatch[0].length).trim(),
    };
  }

  // Try to find a natural break point (comma, dash, colon) within first 80 chars
  const breakMatch = trimmed.slice(0, 80).match(/^(.+?[,\-:—])\s+/);
  if (breakMatch && breakMatch[1].length >= 15) {
    return {
      title: breakMatch[1].trim(),
      notes: trimmed.slice(breakMatch[0].length).trim(),
    };
  }

  // Find last space within first 60 chars to avoid cutting words
  const first60 = trimmed.slice(0, 60);
  const lastSpace = first60.lastIndexOf(" ");

  if (lastSpace > 20) {
    return {
      title: trimmed.slice(0, lastSpace).trim(),
      notes: trimmed.slice(lastSpace + 1).trim(),
    };
  }

  // Fallback: just take first 60 chars
  return {
    title: trimmed.slice(0, 60).trim(),
    notes: trimmed.slice(60).trim(),
  };
}

// Auto-grow textarea as user types
function autoGrow() {
  const textarea = notesTextarea.value;
  if (textarea) {
    textarea.style.height = "auto";
    textarea.style.height =
      Math.min(textarea.scrollHeight, window.innerHeight * 0.5) + "px";
  }
}

// Text form submission handler
async function handleTextSubmit() {
  if (!title.value.trim() && !notes.value.trim()) {
    toast.error("Please enter a title or notes");
    return;
  }

  try {
    const result = await createEntry({
      type: "moment",
      subcategory: voiceSubcategory.value,
      name: title.value.trim() || "Untitled moment",
      notes: notes.value.trim() || undefined,
      emoji: getTypeIcon(voiceSubcategory.value),
      timestamp: new Date().toISOString(),
      data: {
        source: showVoicePanel.value ? "voice" : "text",
      },
    });

    if (result) {
      toast.success(
        `${voiceSubcategory.value === "magic" ? "🪄 Magic moment" : "📝 Moment"} saved!`,
      );

      // Save extracted ta-das if any
      if (extractedTadas.value.length > 0) {
        await saveTadas();
      }

      // Clear form
      title.value = "";
      notes.value = "";
      showVoicePanel.value = false;
      extractedTadas.value = [];

      // Refresh entries
      await refreshEntries();
    }
  } catch (err) {
    logError("moments.saveTextEntry", err);
    toast.error(getErrorMessage(err, "Failed to save moment"));
  }
}

// Handle microphone button click
function handleMicClick() {
  showVoicePanel.value = true;
  isRecording.value = true;
}

// Voice input handlers
async function handleVoiceComplete(
  _blob: Blob,
  _duration: number,
  transcription: string,
) {
  isRecording.value = false;

  if (!transcription?.trim()) {
    toast.error("No speech detected. Please try again.");
    showVoicePanel.value = false;
    return;
  }

  try {
    // Process with LLM to extract ta-das and detect type
    const extraction = await llmStructure.extractTadas(transcription);

    // Store extracted ta-das
    if (extraction.tadas && extraction.tadas.length > 0) {
      extractedTadas.value = extraction.tadas;
    }

    // Detect type/subcategory from journal type if available
    if (extraction.journalType) {
      const typeMap: Record<string, typeof voiceSubcategory.value> = {
        magic: "magic",
        dream: "dream",
        gratitude: "gratitude",
        journal: "journal",
        reflection: "journal",
      };
      const detected = typeMap[extraction.journalType.toLowerCase()];
      if (detected) {
        voiceSubcategory.value = detected;
      }
    }

    // Split text into title and notes smartly
    const text = transcription.trim();
    const { title: extractedTitle, notes: extractedNotes } =
      splitTitleAndNotes(text);

    // Use LLM-extracted title if available and reasonable, otherwise use our split
    if (extraction.title && extraction.title.length <= 80) {
      title.value = extraction.title;
      notes.value = text; // Keep full text as notes for context
    } else {
      title.value = extractedTitle;
      notes.value = extractedNotes;
    }

    // Only keep ta-das that look like actual accomplishments (have meaningful titles)
    if (extraction.tadas && extraction.tadas.length > 0) {
      const meaningfulTadas = extraction.tadas.filter(
        (t) => t.title && t.title.length > 3 && t.title.length < 100,
      );
      extractedTadas.value = meaningfulTadas;
    }

    // Don't auto-save - let user review and save manually
  } catch (err) {
    logError("moments.handleVoiceTranscript", err, {
      transcriptLength: transcriptText.length,
    });
    toast.error(getErrorMessage(err, "Failed to process transcription"));
    showVoicePanel.value = false;
  }
}

async function saveTadas() {
  const { createBatchTadas } = useEntrySave();

  try {
    const result = await createBatchTadas(
      extractedTadas.value.map((tada) => ({
        title: tada.title,
        category: tada.subcategory || "personal",
        significance: tada.significance,
        confidence: tada.confidence || 0.8,
      })),
      `moment-${Date.now()}`, // extractionId
    );

    if (result && result.length > 0) {
      showCelebration.value = true;
      toast.success(
        `${extractedTadas.value.length} ta-da${extractedTadas.value.length > 1 ? "s" : ""}!`,
      );
    }
  } catch (err) {
    logError("moments.saveTadas", err, {
      tadasCount: extractedTadas.value.length,
    });
    toast.error(getErrorMessage(err, "Failed to save accomplishments"));
  }
}

// Handle celebration completion
function onCelebrationComplete() {
  showCelebration.value = false;
  extractedTadas.value = [];
}

async function refreshEntries() {
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

function handleVoiceError(message: string) {
  toast.error(message);
  isRecording.value = false;
}

function handleVoiceCancel() {
  showVoicePanel.value = false;
  isRecording.value = false;
  extractedTadas.value = [];
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
      <!-- Green mic button (hidden when voice panel is shown) -->
      <button
        v-if="!showVoicePanel"
        type="button"
        class="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105"
        title="Voice input"
        @click="handleMicClick"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </button>
    </div>

    <!-- Quick Entry Form -->
    <div
      class="mb-6 rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800 p-6 shadow-sm"
    >
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

      <!-- Voice Panel (shown when recording) -->
      <div
        v-if="showVoicePanel"
        class="mb-4 rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 dark:border-purple-800 dark:from-purple-900/20 dark:to-indigo-900/20 p-4"
      >
        <div class="flex justify-center">
          <VoiceRecorder
            mode="journal"
            :autostart="isRecording"
            @complete="handleVoiceComplete"
            @error="handleVoiceError"
            @cancel="handleVoiceCancel"
          />
        </div>
      </div>

      <!-- Text Input Form -->
      <form class="space-y-3" @submit.prevent="handleTextSubmit">
        <!-- Title input -->
        <div>
          <label
            for="title"
            class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
          >
            Title
          </label>
          <input
            id="title"
            v-model="title"
            type="text"
            placeholder="What happened?"
            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-tada-500 focus:border-transparent"
          />
        </div>

        <!-- Notes textarea -->
        <div>
          <label
            for="notes"
            class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
          >
            Notes (optional)
          </label>
          <textarea
            id="notes"
            ref="notesTextarea"
            v-model="notes"
            rows="3"
            placeholder="Add more details..."
            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-tada-500 focus:border-transparent resize-none"
            @input="autoGrow"
          />
        </div>

        <!-- Extracted Ta-das Panel (if any) -->
        <div
          v-if="extractedTadas.length > 0"
          class="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <h4
              class="text-sm font-semibold text-amber-900 dark:text-amber-100"
            >
              🎯 Ta-das detected ({{ extractedTadas.length }})
            </h4>
            <button
              type="button"
              class="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
              @click="extractedTadas = []"
            >
              Clear all
            </button>
          </div>
          <ul class="space-y-1">
            <li
              v-for="(tada, idx) in extractedTadas"
              :key="idx"
              class="flex items-center justify-between text-sm text-amber-800 dark:text-amber-200 bg-white dark:bg-stone-800 rounded px-2 py-1"
            >
              <span> • {{ tada.title }} </span>
              <button
                type="button"
                class="ml-2 p-0.5 text-stone-400 hover:text-red-500 rounded transition-colors"
                title="Remove"
                @click="extractedTadas.splice(idx, 1)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          </ul>
          <p class="text-xs text-amber-700 dark:text-amber-300 mt-2">
            These will be saved with the moment • Remove any you don't want
          </p>
        </div>

        <!-- Submit button -->
        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="isSaving"
            class="px-6 py-2 bg-tada-600 hover:bg-tada-700 disabled:bg-stone-300 dark:disabled:bg-stone-600 text-white rounded-lg font-medium transition-colors shadow-sm disabled:cursor-not-allowed"
          >
            <span v-if="isSaving">Saving...</span>
            <span v-else>Save Moment</span>
          </button>
        </div>
      </form>
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

    <!-- Celebration overlay -->
    <CelebrationOverlay
      :show="showCelebration"
      :sound-file="getTadaSoundFile()"
      @complete="onCelebrationComplete"
    />
  </div>
</template>

<style scoped>
/* Page-specific styles */
</style>
