<script setup lang="ts">
import type { Entry } from "~/server/db/schema";
import {
  CATEGORY_DEFAULTS,
  getSubcategoriesForCategory,
} from "~/utils/categoryDefaults";
import type { EntryInput, EntryType } from "~/utils/entrySchemas";

const { error: showError, success: showSuccess } = useToast();

// Use unified entry engine for entry restoration
const { createEntry } = useEntryEngine();
// Keep useEntrySave for update/delete until migration
const { updateEntry, isLoading: isSaving } = useEntrySave();

// Undo composable for deletion recovery
const { addToUndo } = useUndo({
  expiry: 10000, // 10 seconds to undo
  onExpire: async (item) => {
    // Entry is already deleted on server, nothing more to do
    console.debug("Undo expired for entry:", item.id);
  },
});

// User preferences for category visibility
const { loadPreferences, isCategoryVisible } = usePreferences();

definePageMeta({
  layout: "default",
});

const route = useRoute();
const entryId = route.params["id"] as string;

// Form state
const entry = ref<Entry | null>(null);
const isLoading = ref(true);
const isDeleting = ref(false);
const error = ref<string | null>(null);
const showAdvanced = ref(false);
const showEmojiPicker = ref(false);

// Editable fields
const name = ref("");
const notes = ref("");
const notesTextarea = ref<HTMLTextAreaElement | null>(null);
const timestamp = ref("");
const tags = ref<string[]>([]);
const category = ref<string | null>(null);
const subcategory = ref<string | null>(null);
const emoji = ref<string | null>(null);
const durationSeconds = ref<number | null>(null);

// Auto-grow textarea as user types
function autoGrow() {
  const textarea = notesTextarea.value;
  if (textarea) {
    textarea.style.height = "auto";
    textarea.style.height =
      Math.min(textarea.scrollHeight, window.innerHeight * 0.5) + "px";
  }
}

// Load entry
async function loadEntry() {
  try {
    isLoading.value = true;
    await loadPreferences();
    const data = await $fetch<Entry>(`/api/entries/${entryId}`);
    entry.value = data;

    // Populate form fields
    name.value = data.name;
    notes.value = data.notes || "";
    timestamp.value = data.timestamp;
    tags.value = data.tags || [];
    category.value = data.category || null;
    subcategory.value = data.subcategory || null;
    emoji.value = data.emoji || null;
    durationSeconds.value = data.durationSeconds || null;
  } catch (err: unknown) {
    console.error("Failed to load entry:", err);
    error.value = err instanceof Error ? err.message : "Failed to load entry";
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadEntry);

// Category options
const categoryOptions = computed(() => {
  return Object.keys(CATEGORY_DEFAULTS)
    .filter((slug) => isCategoryVisible(slug))
    .map((slug) => ({
      value: slug,
      label: CATEGORY_DEFAULTS[slug]!.label,
      emoji: CATEGORY_DEFAULTS[slug]!.emoji,
    }));
});

// Subcategory options based on selected category
const subcategoryOptions = computed(() => {
  if (!category.value) return [];
  return getSubcategoriesForCategory(category.value).map((s) => ({
    value: s.slug,
    label: s.label,
    emoji: s.emoji,
  }));
});

// Save changes
async function saveEntry() {
  if (!entry.value) return;

  const result = await updateEntry(
    entryId,
    {
      name: name.value,
      notes: notes.value || null,
      timestamp: timestamp.value,
      tags: tags.value.length > 0 ? tags.value : undefined,
      category: category.value,
      subcategory: subcategory.value,
      emoji: emoji.value,
      durationSeconds: durationSeconds.value,
    },
    {
      navigateTo: "/",
      successMessage: "Entry saved!",
      skipEmojiResolution: true, // Keep the manually selected emoji
    },
  );

  // Result will be null if save failed (error already shown by composable)
  if (!result) return;
}

// Delete entry with undo support
async function deleteEntry() {
  if (!entry.value) return;
  if (!confirm("Are you sure you want to delete this entry?")) return;

  const entryData = { ...entry.value };
  isDeleting.value = true;

  try {
    await $fetch<unknown>(`/api/entries/${entryId}`, {
      method: "DELETE",
    });

    // Add to undo stack
    addToUndo(entryId, "entry", entryData);

    // Show toast with undo action
    showSuccess(`Entry deleted`, {
      duration: 10000,
      action: {
        label: "Undo",
        onClick: async () => {
          await restoreEntry(entryData);
        },
      },
    });

    // Navigate back to timeline
    navigateTo("/");
  } catch (err: unknown) {
    console.error("Failed to delete entry:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    showError(`Failed to delete entry: ${message}`);
  } finally {
    isDeleting.value = false;
  }
}

// Restore a deleted entry
async function restoreEntry(data: Entry) {
  const result = await createEntry(
    {
      type: data.type as EntryType,
      name: data.name,
      category: data.category ?? undefined,
      subcategory: data.subcategory ?? undefined,
      emoji: data.emoji ?? undefined,
      timestamp: data.timestamp,
      durationSeconds: data.durationSeconds ?? undefined,
      data: data.data as Record<string, unknown> | undefined,
      tags: data.tags ?? undefined,
      notes: data.notes ?? undefined,
    } as EntryInput,
    { skipEmojiResolution: true },
  );

  if (result) {
    showSuccess("Entry restored!");
  } else {
    showError("Failed to restore entry");
  }
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

// Check if notes contain voice transcription
const hasVoiceNotes = computed(() => {
  return notes.value?.includes("🎤") ?? false;
});

// Parsed entry data for rich display
const entryData = computed(() => {
  if (!entry.value?.data) return null;
  const data = entry.value.data as Record<string, unknown>;
  return {
    mood: typeof data["mood"] === "number" ? (data["mood"] as number) : null,
    qualityRating:
      typeof data["qualityRating"] === "number"
        ? (data["qualityRating"] as number)
        : null,
    reflection:
      typeof data["reflection"] === "string"
        ? (data["reflection"] as string)
        : null,
    fromVoice: data["fromVoice"] === true,
    significance:
      typeof data["significance"] === "string"
        ? (data["significance"] as string)
        : null,
    mode: typeof data["mode"] === "string" ? (data["mode"] as string) : null,
    practiceUrl:
      typeof data["practiceUrl"] === "string"
        ? (data["practiceUrl"] as string)
        : null,
    practiceTitle:
      typeof data["practiceTitle"] === "string"
        ? (data["practiceTitle"] as string)
        : null,
  };
});

// Format mood as emoji
function getMoodEmoji(mood: number): string {
  const moods = ["😔", "😐", "🙂", "😊", "🤩"];
  return moods[mood - 1] || "🙂";
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
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
        Failed to load entry
      </h2>
      <p class="text-stone-500 dark:text-stone-400 mb-4">{{ error }}</p>
      <NuxtLink
        to="/"
        class="inline-block px-4 py-2 bg-tada-600 hover:opacity-90 text-black dark:bg-tada-600 dark:text-white rounded-lg font-medium transition-colors"
      >
        Back to timeline
      </NuxtLink>
    </div>

    <!-- Edit form -->
    <div v-else-if="entry">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <NuxtLink
          to="/"
          class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 text-stone-600 dark:text-stone-300"
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
        <div class="flex-1">
          <h1
            class="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2"
          >
            <span>{{ getTypeIcon(entry.type) }}</span>
            <span>Edit Entry</span>
          </h1>
        </div>
      </div>

      <!-- Form -->
      <div
        class="bg-gradient-to-br from-stone-50 via-stone-100/50 to-stone-50 dark:from-stone-800 dark:via-stone-800/80 dark:to-stone-800 rounded-2xl p-6 shadow-lg border-2 border-stone-200 dark:border-stone-600 space-y-6"
      >
        <!-- Hero: Large Emoji + Title -->
        <div>
          <!-- Clickable Emoji -->
          <div class="flex justify-center mb-4">
            <button
              type="button"
              class="text-6xl hover:scale-110 transition-transform cursor-pointer p-2 rounded-2xl hover:bg-stone-200/50 dark:hover:bg-stone-700/50"
              title="Click to change emoji"
              @click="showEmojiPicker = !showEmojiPicker"
            >
              {{ emoji || getTypeIcon(entry.type) }}
            </button>
          </div>

          <!-- Large Title Input -->
          <input
            v-model="name"
            type="text"
            class="w-full px-4 py-4 text-xl font-bold text-center rounded-xl border-2 border-stone-300 dark:border-stone-600 bg-white/80 dark:bg-stone-900/80 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-4 focus:ring-stone-400/30 dark:focus:ring-stone-500/30 focus:border-stone-400 dark:focus:border-stone-500"
            placeholder="Entry title"
          />

          <p
            class="text-center text-sm text-stone-500 dark:text-stone-400 mt-3"
          >
            Tap the emoji to customize it ☝️
          </p>
        </div>

        <!-- Emoji Picker (moved here, shown inline) -->
        <EmojiPicker
          v-model="showEmojiPicker"
          :entry-name="name"
          @select="(e) => (emoji = e)"
        />

        <!-- Timestamp -->
        <DateTimeInput v-model="timestamp" label="Date & Time" />

        <!-- Voice/Timer Metadata (if present) -->
        <div
          v-if="
            entryData &&
            (entryData.mood ||
              entryData.qualityRating ||
              entryData.reflection ||
              entryData.fromVoice)
          "
          class="space-y-3 p-4 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800"
        >
          <div
            class="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-300"
          >
            <span v-if="entryData.fromVoice">🎤</span>
            <span v-else>📊</span>
            <span>{{
              entryData.fromVoice ? "Voice Captured" : "Session Details"
            }}</span>
          </div>

          <!-- Mood / Quality Rating -->
          <div
            v-if="entryData.mood || entryData.qualityRating"
            class="flex items-center gap-3"
          >
            <span class="text-2xl">{{
              getMoodEmoji(entryData.qualityRating || entryData.mood || 3)
            }}</span>
            <div>
              <div
                class="text-sm font-medium text-stone-700 dark:text-stone-200"
              >
                {{ entryData.qualityRating ? "Session Quality" : "Mood" }}
              </div>
              <div class="text-xs text-stone-500 dark:text-stone-400">
                {{
                  ["Difficult", "Challenging", "Okay", "Good", "Great"][
                    (entryData.qualityRating || entryData.mood || 3) - 1
                  ]
                }}
              </div>
            </div>
          </div>

          <!-- Reflection (from voice) -->
          <div v-if="entryData.reflection" class="space-y-1">
            <div
              class="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider"
            >
              Reflection
            </div>
            <p
              class="text-sm text-stone-700 dark:text-stone-200 leading-relaxed italic"
            >
              "{{ entryData.reflection }}"
            </p>
          </div>

          <!-- Practice Link (for sessions) -->
          <div v-if="entryData.practiceUrl" class="space-y-1">
            <div
              class="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider"
            >
              Practice
            </div>
            <a
              :href="entryData.practiceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              <span>{{
                entryData.practiceTitle || entryData.practiceUrl
              }}</span>
            </a>
          </div>

          <!-- Significance badge (for voice-captured tadas) -->
          <div
            v-if="entryData.significance && entryData.significance !== 'normal'"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            :class="{
              'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200':
                entryData.significance === 'major',
              'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300':
                entryData.significance === 'minor',
            }"
          >
            <span v-if="entryData.significance === 'major'">⭐</span>
            <span v-else>·</span>
            <span>{{
              entryData.significance === "major"
                ? "Major accomplishment!"
                : "Quick win"
            }}</span>
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label
            class="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2"
          >
            Notes
            <span
              v-if="hasVoiceNotes"
              class="ml-2 text-xs font-normal text-indigo-500 dark:text-indigo-400"
            >
              (includes voice transcription)
            </span>
          </label>
          <textarea
            ref="notesTextarea"
            v-model="notes"
            rows="4"
            class="journal-textarea w-full px-5 py-4 rounded-xl border border-stone-200 dark:border-stone-600 bg-white/80 dark:bg-stone-900/80 text-stone-800 dark:text-stone-100 placeholder-stone-400/60 dark:placeholder-stone-500/60 focus:outline-none focus:ring-2 focus:ring-stone-400/50 focus:border-stone-300 dark:focus:border-stone-500 focus:bg-white dark:focus:bg-stone-900 transition-all duration-200"
            placeholder="Add notes or details..."
            @input="autoGrow"
          />
        </div>

        <!-- Category & Subcategory -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label
              class="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2"
            >
              Category
            </label>
            <select
              v-model="category"
              class="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 bg-white/80 dark:bg-stone-900/80 text-stone-900 dark:text-white focus:ring-2 focus:ring-stone-400/50 focus:border-stone-300 dark:focus:border-stone-500"
            >
              <option value="">No category</option>
              <option
                v-for="cat in categoryOptions"
                :key="cat.value"
                :value="cat.value"
              >
                {{ cat.emoji }} {{ cat.label }}
              </option>
            </select>
          </div>
          <div>
            <label
              class="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2"
            >
              Subcategory
            </label>
            <select
              v-model="subcategory"
              :disabled="!category"
              class="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 bg-white/80 dark:bg-stone-900/80 text-stone-900 dark:text-white focus:ring-2 focus:ring-stone-400/50 focus:border-stone-300 dark:focus:border-stone-500 disabled:opacity-50"
            >
              <option value="">No subcategory</option>
              <option
                v-for="sub in subcategoryOptions"
                :key="sub.value"
                :value="sub.value"
              >
                {{ sub.emoji }} {{ sub.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Duration (for timed entries) -->
        <DurationInput
          v-if="entry.type === 'timed' || entry.type === 'meditation'"
          v-model="durationSeconds"
          label="Duration"
        />

        <!-- Entry metadata (read-only) -->
        <div class="pt-4 border-t border-stone-200 dark:border-stone-700">
          <button
            type="button"
            class="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 mb-3"
            @click="showAdvanced = !showAdvanced"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 transition-transform"
              :class="{ 'rotate-90': showAdvanced }"
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
            Advanced Details
          </button>
          <div v-if="showAdvanced" class="space-y-3 text-sm">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-stone-500 dark:text-stone-400">Type:</span>
                <span class="ml-2 text-stone-700 dark:text-stone-300">{{
                  entry.type
                }}</span>
              </div>
              <div v-if="entry.source">
                <span class="text-stone-500 dark:text-stone-400">Source:</span>
                <span class="ml-2 text-stone-700 dark:text-stone-300">{{
                  entry.source
                }}</span>
              </div>
              <div>
                <span class="text-stone-500 dark:text-stone-400">Created:</span>
                <span class="ml-2 text-stone-700 dark:text-stone-300">{{
                  new Date(entry.createdAt).toLocaleString()
                }}</span>
              </div>
              <div v-if="entry.updatedAt !== entry.createdAt">
                <span class="text-stone-500 dark:text-stone-400">Updated:</span>
                <span class="ml-2 text-stone-700 dark:text-stone-300">{{
                  new Date(entry.updatedAt).toLocaleString()
                }}</span>
              </div>
            </div>
            <div v-if="entry.data">
              <span class="text-stone-500 dark:text-stone-400 block mb-1"
                >Data (JSON):</span
              >
              <pre
                class="text-xs bg-stone-100 dark:bg-stone-900 p-2 rounded overflow-x-auto"
                >{{ JSON.stringify(entry.data, null, 2) }}</pre
              >
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-4">
          <button
            :disabled="isSaving"
            class="flex-1 py-3 px-4 bg-gradient-to-r from-stone-600 to-stone-700 hover:from-stone-700 hover:to-stone-800 disabled:from-stone-300 disabled:to-stone-300 dark:disabled:from-stone-600 dark:disabled:to-stone-600 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg disabled:shadow-none"
            @click="saveEntry"
          >
            <span v-if="!isSaving">Save Changes</span>
            <span v-else class="flex items-center justify-center gap-2">
              <div
                class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"
              />
              Saving...
            </span>
          </button>
          <button
            :disabled="isDeleting"
            class="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-md"
            @click="deleteEntry"
          >
            <span v-if="!isDeleting">Delete</span>
            <span v-else>Deleting...</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.journal-textarea {
  font-family: "Georgia", "Times New Roman", serif;
  font-size: 1.125rem;
  line-height: 1.75;
  letter-spacing: 0.01em;
  resize: none;
  min-height: 6rem;
  max-height: 50vh;
  overflow-y: auto;
  field-sizing: content;
}

.journal-textarea::placeholder {
  font-style: italic;
  opacity: 0.6;
}

.journal-textarea:focus {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04);
}

.journal-textarea::-webkit-scrollbar {
  width: 6px;
}

.journal-textarea::-webkit-scrollbar-track {
  background: transparent;
}

.journal-textarea::-webkit-scrollbar-thumb {
  background: rgba(120, 113, 108, 0.3);
  border-radius: 3px;
}

.journal-textarea::-webkit-scrollbar-thumb:hover {
  background: rgba(120, 113, 108, 0.5);
}
</style>
