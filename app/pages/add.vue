<script setup lang="ts">
// Journal entry page - quick capture with category selection
import {
  CATEGORY_DEFAULTS,
  getSubcategoriesForCategory,
} from "~/utils/categoryDefaults";
import type { TranscriptionResult, VoiceRecordingStatus } from "~/types/voice";
import type { VoiceEntryData } from "~/composables/useEntrySave";
import type { ExtractedTada } from "~/types/extraction";

// Use the unified entry save composable
const {
  createEntry,
  createVoiceEntry,
  createBatchTadas,
  isLoading: isSubmitting,
} = useEntrySave();
const { success: showSuccess, error: showError } = useToast();

// Load user preferences
const { loadPreferences, isCategoryVisible } = usePreferences();

// Voice composables
const transcription = useTranscription();
const llmStructure = useLLMStructure();

// Voice state
const showTadaChecklist = ref(false);
const currentTranscription = ref<TranscriptionResult | null>(null);
const extractedTadas = ref<ExtractedTada[]>([]);
const recordingDuration = ref(0);
const voiceStatus = ref<VoiceRecordingStatus>("idle");

// Load preferences on mount
onMounted(() => {
  loadPreferences();
});

definePageMeta({
  layout: "default",
});

const route = useRoute();

// Form state
const title = ref("");
const notes = ref("");
const notesTextarea = ref<HTMLTextAreaElement | null>(null);
const category = ref<string>((route.query["category"] as string) || "journal");
const subcategory = ref<string>(
  (route.query["subcategory"] as string) || "reflection",
);
const customEmoji = ref<string | null>(null);
const showEmojiPicker = ref(false);

// Auto-grow textarea as user types
function autoGrow() {
  const textarea = notesTextarea.value;
  if (textarea) {
    textarea.style.height = "auto";
    textarea.style.height =
      Math.min(textarea.scrollHeight, window.innerHeight * 0.5) + "px";
  }
}

// Entry type derived from category
const entryType = computed(() => {
  if (category.value === "journal") return "journal";
  if (category.value === "accomplishment") return "tada";
  return "note";
});

// Available categories (filtered by user preferences)
const availableCategories = computed(() => {
  // For journal page, show journal-related categories
  const journalCategories = ["journal", "events"];
  return journalCategories
    .filter((slug) => isCategoryVisible(slug))
    .map((slug) => ({
      slug,
      ...CATEGORY_DEFAULTS[slug]!,
    }));
});

// Subcategories for selected category
const subcategoryOptions = computed(() => {
  return getSubcategoriesForCategory(category.value);
});

// Current emoji to display (custom or from subcategory/category)
const displayEmoji = computed(() => {
  if (customEmoji.value) return customEmoji.value;
  const subcat = subcategoryOptions.value.find(
    (s) => s.slug === subcategory.value,
  );
  if (subcat) return subcat.emoji;
  return CATEGORY_DEFAULTS[category.value]?.emoji || "📝";
});

// When category changes, reset subcategory to first option
watch(category, (newCat) => {
  const subs = getSubcategoriesForCategory(newCat);
  if (subs.length > 0 && subs[0]) {
    subcategory.value = subs[0].slug;
  } else {
    subcategory.value = "";
  }
  // Reset custom emoji when category changes
  customEmoji.value = null;
});

// When subcategory changes, reset custom emoji
watch(subcategory, () => {
  customEmoji.value = null;
});

// Handle emoji selection
function handleEmojiSelect(emoji: string) {
  customEmoji.value = emoji;
}

// Dream-specific fields (shown when subcategory is dream)
const dreamData = ref({
  lucid: false,
  vivid: 3,
  emotions: [] as string[],
});

const emotionOptions = [
  "joy",
  "fear",
  "wonder",
  "anxiety",
  "peace",
  "confusion",
  "love",
  "anger",
  "sadness",
];

async function submitEntry() {
  if (!title.value.trim() && !notes.value.trim()) return;

  const result = await createEntry(
    {
      type: entryType.value,
      name: title.value.trim() || "Journal entry",
      category: category.value,
      subcategory: subcategory.value || undefined,
      emoji: customEmoji.value || displayEmoji.value,
      notes: notes.value.trim() || null,
      data: subcategory.value === "dream" ? dreamData.value : {},
      tags: subcategory.value === "dream" ? ["dream"] : [],
    },
    {
      skipEmojiResolution: true,
      navigateTo: "/",
      showSuccessToast: false,
    },
  );

  if (result) {
    showSuccess("Entry saved! ✨");
  }
}

// Voice recording handlers - store live transcription text
const liveTranscriptionText = ref("");

function handleVoiceLiveTranscription(text: string) {
  liveTranscriptionText.value = text;
}

async function handleVoiceComplete(
  blob: Blob,
  duration: number,
  transcriptionText: string,
) {
  recordingDuration.value = duration;

  // Use the transcription text passed directly from VoiceRecorder (most reliable)
  // Fall back to liveTranscriptionText or composable result if not provided
  const transcriptText =
    transcriptionText ||
    liveTranscriptionText.value ||
    transcription.result.value?.text ||
    "";

  if (!transcriptText.trim()) {
    voiceStatus.value = "idle";
    showError("No speech detected. Please speak clearly and try again.");
    liveTranscriptionText.value = "";
    return;
  }

  // Store for potential ta-da extraction
  currentTranscription.value = {
    text: transcriptText,
    provider: "web-speech",
    processingMethod: "web-speech",
    confidence: 0.8,
    duration: duration,
  };
  liveTranscriptionText.value = "";

  // ALWAYS populate the journal form first with the transcription
  populateJournalForm(transcriptText);

  // Try to detect ta-das in the background
  voiceStatus.value = "processing";

  try {
    const extraction = await llmStructure.extractTadas(transcriptText);

    if (extraction && extraction.tadas.length > 0) {
      // Found ta-das - show checklist as an optional popup
      // User can choose to save them as tadas OR continue editing the journal
      extractedTadas.value = extraction.tadas;
      showTadaChecklist.value = true;
      showSuccess(
        `Also found ${extraction.tadas.length} ta-da${extraction.tadas.length > 1 ? "s" : ""}! Review the popup to save them.`,
      );
    } else {
      showSuccess("Journal populated! Edit and save below.");
    }
    voiceStatus.value = "idle";
  } catch (err) {
    console.error("[add.vue] Extraction error:", err);
    // On error, journal form is already populated, just continue
    showSuccess("Journal populated! Edit and save below.");
    voiceStatus.value = "idle";
  }
}

/**
 * Populate the journal form with transcribed text
 */
function populateJournalForm(text: string) {
  // If there's already content, append to notes
  if (title.value.trim() || notes.value.trim()) {
    notes.value = notes.value.trim()
      ? `${notes.value.trim()}\n\n${text}`
      : text;
  } else {
    // Extract first sentence or short phrase as title, rest as notes
    const firstSentenceMatch = text.match(/^([^.!?]+[.!?]?)\s*/);
    if (firstSentenceMatch && firstSentenceMatch[1]) {
      const firstPart = firstSentenceMatch[1].trim();
      const rest = text.slice(firstSentenceMatch[0].length).trim();

      // If first sentence is short enough, use as title
      if (firstPart.length <= 60) {
        title.value = firstPart;
        notes.value = rest;
      } else {
        // Long first sentence - put everything in notes
        notes.value = text;
      }
    } else {
      // No clear sentence - put in notes
      notes.value = text;
    }
  }

  // Focus notes for easy editing
  nextTick(() => {
    notesTextarea.value?.focus();
    autoGrow();
  });
}

function handleVoiceCancel() {
  voiceStatus.value = "idle";
}

function handleVoiceError(message: string) {
  voiceStatus.value = "error";
  showError(message);
}

function handleReRecord() {
  showTadaChecklist.value = false;
  currentTranscription.value = null;
  extractedTadas.value = [];
  title.value = "";
  notes.value = "";
  // User will tap the mic button again to re-record
}

// Tada checklist handlers
async function handleTadaSave(selectedTadas: ExtractedTada[]) {
  if (selectedTadas.length === 0) return;

  // Generate an extraction ID for linking these tadas together
  const extractionId = crypto.randomUUID();
  const result = await createBatchTadas(selectedTadas, extractionId);

  if (result) {
    showTadaChecklist.value = false;
    extractedTadas.value = [];
    currentTranscription.value = null;
    // Navigate to home after batch save
    await navigateTo("/");
  }
}

async function handleTadaSaveAsJournal(text: string) {
  if (!currentTranscription.value) return;

  const voiceData: VoiceEntryData = {
    transcription: currentTranscription.value.text,
    sttProvider: currentTranscription.value.provider,
    confidence: currentTranscription.value.confidence,
    recordingDurationMs: recordingDuration.value * 1000,
  };

  const result = await createVoiceEntry(text, voiceData, {
    navigateTo: "/",
  });

  if (result) {
    showTadaChecklist.value = false;
    extractedTadas.value = [];
    currentTranscription.value = null;
  }
}

function handleTadaCancel() {
  showTadaChecklist.value = false;
  extractedTadas.value = [];
}

function handleTadaUpdate(updated: ExtractedTada[]) {
  extractedTadas.value = updated;
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Page header with mic button -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <NuxtLink
          to="/"
          class="p-2 -ml-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </NuxtLink>
        <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
          New Entry
        </h1>
      </div>

      <!-- Compact Voice Recorder in header -->
      <VoiceRecorder
        compact
        @complete="handleVoiceComplete"
        @cancel="handleVoiceCancel"
        @error="handleVoiceError"
        @transcription="handleVoiceLiveTranscription"
      />
    </div>

    <form
      class="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/30 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border-2 border-indigo-200 dark:border-indigo-700 shadow-lg space-y-6"
      @submit.prevent="submitEntry"
    >
      <!-- Hero Section: Large Emoji + Title -->
      <div>
        <!-- Clickable Emoji -->
        <div class="flex justify-center mb-4">
          <button
            type="button"
            class="text-7xl hover:scale-110 transition-transform cursor-pointer p-2 rounded-2xl hover:bg-indigo-100/50 dark:hover:bg-indigo-800/30"
            title="Click to change emoji"
            @click="showEmojiPicker = true"
          >
            {{ displayEmoji }}
          </button>
        </div>

        <!-- Large Title Input -->
        <input
          id="title"
          v-model="title"
          type="text"
          placeholder="What's on your mind?"
          class="w-full px-4 py-4 text-2xl font-bold text-center rounded-xl border-2 border-indigo-300 dark:border-indigo-600 bg-white/80 dark:bg-stone-800/80 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-4 focus:ring-indigo-400/50 dark:focus:ring-indigo-500/50 focus:border-indigo-400 dark:focus:border-indigo-500"
          autofocus
        />

        <p
          class="text-center text-sm text-indigo-600 dark:text-indigo-400 mt-3"
        >
          Tap the emoji to customize it ☝️
        </p>
      </div>

      <!-- Category Selection -->
      <div>
        <label
          class="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2"
        >
          Category
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in availableCategories"
            :key="cat.slug"
            type="button"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            :class="
              category === cat.slug
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
            "
            @click="category = cat.slug"
          >
            <span class="text-lg">{{ cat.emoji }}</span>
            <span>{{ cat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Subcategory Selection -->
      <div v-if="subcategoryOptions.length > 0">
        <label
          class="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2"
        >
          Type
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="sub in subcategoryOptions"
            :key="sub.slug"
            type="button"
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
            :class="
              subcategory === sub.slug
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
            "
            @click="subcategory = sub.slug"
          >
            <span>{{ sub.emoji }}</span>
            <span>{{ sub.label }}</span>
          </button>
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label
          for="notes"
          class="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2"
        >
          Details
        </label>
        <textarea
          id="notes"
          ref="notesTextarea"
          v-model="notes"
          rows="4"
          :placeholder="
            subcategory === 'dream'
              ? 'Describe the dream in detail...'
              : 'Write freely...'
          "
          class="journal-textarea w-full px-5 py-4 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white/80 dark:bg-stone-800/80 text-stone-800 dark:text-stone-100 placeholder-indigo-400/60 dark:placeholder-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-300 dark:focus:border-indigo-600 focus:bg-white dark:focus:bg-stone-800 transition-all duration-200"
          @input="autoGrow"
        />
      </div>

      <!-- Dream-specific fields -->
      <template v-if="subcategory === 'dream'">
        <!-- Lucid toggle -->
        <div class="flex items-center justify-between">
          <label
            for="lucid"
            class="text-sm font-medium text-indigo-700 dark:text-indigo-300"
          >
            Lucid dream?
          </label>
          <button
            type="button"
            class="relative w-12 h-7 rounded-full transition-colors"
            :class="
              dreamData.lucid
                ? 'bg-indigo-500 dark:bg-indigo-600'
                : 'bg-stone-300 dark:bg-stone-600'
            "
            role="switch"
            :aria-checked="dreamData.lucid"
            aria-label="Toggle lucid dream"
            @click="dreamData.lucid = !dreamData.lucid"
          >
            <span
              class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform"
              :class="dreamData.lucid ? 'translate-x-5' : ''"
            />
          </button>
        </div>

        <!-- Vividness slider -->
        <div>
          <label
            class="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2"
          >
            Vividness: {{ dreamData.vivid }}/5
          </label>
          <input
            v-model.number="dreamData.vivid"
            type="range"
            min="1"
            max="5"
            class="w-full accent-indigo-500 dark:accent-indigo-400"
          />
        </div>

        <!-- Emotions -->
        <div>
          <label
            class="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2"
          >
            Emotions
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="emotion in emotionOptions"
              :key="emotion"
              type="button"
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              :class="
                dreamData.emotions.includes(emotion)
                  ? 'bg-indigo-500 text-white dark:bg-indigo-600'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              "
              @click="
                dreamData.emotions.includes(emotion)
                  ? (dreamData.emotions = dreamData.emotions.filter(
                      (e) => e !== emotion,
                    ))
                  : dreamData.emotions.push(emotion)
              "
            >
              {{ emotion }}
            </button>
          </div>
        </div>
      </template>

      <!-- Submit button -->
      <button
        type="submit"
        :disabled="isSubmitting || (!title.trim() && !notes.trim())"
        class="w-full py-4 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-stone-300 disabled:to-stone-300 dark:disabled:from-stone-600 dark:disabled:to-stone-600 text-white font-bold text-xl rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg disabled:shadow-none flex items-center justify-center gap-3"
      >
        <span v-if="isSubmitting">Saving...</span>
        <template v-else>
          <span class="text-2xl">{{ displayEmoji }}</span>
          <span>Save Entry</span>
        </template>
      </button>
    </form>

    <!-- Voice Status Indicator (floats when recording) -->
    <div
      v-if="voiceStatus !== 'idle'"
      class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
    >
      <VoiceStatusIndicator
        :status="voiceStatus"
        :progress="transcription.progress.value"
        class="bg-white dark:bg-stone-800 rounded-full shadow-lg px-4 py-2"
      />
    </div>

    <!-- Tada Checklist Review -->
    <VoiceTadaChecklistReview
      v-if="showTadaChecklist"
      :tadas="extractedTadas"
      :transcription="currentTranscription?.text || ''"
      :loading="isSubmitting"
      @save="handleTadaSave"
      @save-as-journal="handleTadaSaveAsJournal"
      @cancel="handleTadaCancel"
      @re-record="handleReRecord"
      @update="handleTadaUpdate"
    />

    <!-- Emoji Picker -->
    <EmojiPicker
      v-model="showEmojiPicker"
      entry-name="this entry"
      @select="handleEmojiSelect"
    />
  </div>
</template>

<style scoped>
.journal-textarea {
  font-family: "Georgia", "Times New Roman", serif;
  font-size: 1.125rem;
  line-height: 1.75;
  letter-spacing: 0.01em;
  resize: none;
  min-height: 8rem;
  max-height: 50vh;
  overflow-y: auto;
  field-sizing: content; /* Modern CSS for auto-grow, progressive enhancement */
}

.journal-textarea::placeholder {
  font-style: italic;
  opacity: 0.6;
}

/* Subtle inner shadow for depth */
.journal-textarea:focus {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04);
}

/* Smooth scrollbar when needed */
.journal-textarea::-webkit-scrollbar {
  width: 6px;
}

.journal-textarea::-webkit-scrollbar-track {
  background: transparent;
}

.journal-textarea::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 3px;
}

.journal-textarea::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.5);
}
</style>
