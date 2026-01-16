<script setup lang="ts">
import type { Entry } from "~/server/db/schema";
import {
  CATEGORY_DEFAULTS,
  getSubcategoriesForCategory,
} from "~/utils/categoryDefaults";

const { error: showError, success: showSuccess } = useToast();

// Use unified entry save composable for updates
const { updateEntry, createEntry, isLoading: isSaving } = useEntrySave();

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
const timestamp = ref("");
const tags = ref<string[]>([]);
const category = ref<string | null>(null);
const subcategory = ref<string | null>(null);
const emoji = ref<string | null>(null);
const durationSeconds = ref<number | null>(null);

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
    }
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
    await $fetch(`/api/entries/${entryId}`, {
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
      type: data.type,
      name: data.name,
      category: data.category ?? undefined,
      subcategory: data.subcategory ?? undefined,
      emoji: data.emoji ?? undefined,
      timestamp: data.timestamp,
      durationSeconds: data.durationSeconds ?? undefined,
      data: data.data as Record<string, unknown> | undefined,
      tags: data.tags ?? undefined,
      notes: data.notes ?? undefined,
    },
    {
      skipEmojiResolution: true, // Preserve original emoji
      successMessage: "Entry restored!",
    }
  );

  if (!result) {
    console.error("Failed to restore entry");
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
        class="bg-white dark:bg-stone-800 rounded-xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 space-y-6"
      >
        <!-- Title -->
        <div>
          <label
            class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
          >
            Title
          </label>
          <input
            v-model="name"
            type="text"
            class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-tada-500 dark:focus:ring-tada-500 focus:border-transparent"
            placeholder="Entry title"
          />
        </div>

        <!-- Timestamp -->
        <DateTimeInput v-model="timestamp" label="Date & Time" />

        <!-- Notes -->
        <div>
          <label
            class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
          >
            Notes
          </label>
          <textarea
            v-model="notes"
            rows="6"
            class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-tada-500 dark:focus:ring-tada-500 focus:border-transparent resize-none"
            placeholder="Add notes or details..."
          />
        </div>

        <!-- Category & Subcategory -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label
              class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
            >
              Category
            </label>
            <select
              v-model="category"
              class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-tada-500 dark:focus:ring-tada-500 focus:border-transparent"
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
              class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
            >
              Subcategory
            </label>
            <select
              v-model="subcategory"
              :disabled="!category"
              class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-tada-500 dark:focus:ring-tada-500 focus:border-transparent disabled:opacity-50"
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

        <!-- Emoji -->
        <div>
          <label
            class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
          >
            Emoji
          </label>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="w-12 h-12 text-2xl rounded-lg border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              @click="showEmojiPicker = !showEmojiPicker"
            >
              {{ emoji || "➕" }}
            </button>
            <span class="text-sm text-stone-500 dark:text-stone-400">
              Click to change emoji
            </span>
          </div>
          <EmojiPicker
            v-model="showEmojiPicker"
            :entry-name="name"
            @select="(e) => (emoji = e)"
          />
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
            class="flex-1 px-4 py-2 bg-tada-600 hover:opacity-90 text-black dark:bg-tada-600 dark:text-white dark:hover:opacity-90 disabled:bg-stone-300 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
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
            class="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
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
