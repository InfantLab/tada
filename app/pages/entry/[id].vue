<script setup lang="ts">
import type { Entry } from "~/server/db/schema";

definePageMeta({
  layout: "default",
});

const route = useRoute();
const entryId = route.params["id"] as string;

// Form state
const entry = ref<Entry | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const isDeleting = ref(false);
const error = ref<string | null>(null);

// Editable fields
const name = ref("");
const notes = ref("");
const timestamp = ref("");
const tags = ref<string[]>([]);

// Load entry
async function loadEntry() {
  try {
    isLoading.value = true;
    const data = await $fetch<Entry>(`/api/entries/${entryId}`);
    entry.value = data;

    // Populate form fields
    name.value = data.name;
    notes.value = data.notes || "";
    timestamp.value = formatDatetimeLocal(
      data.timestamp || data.startedAt || data.date || data.createdAt
    );
    tags.value = data.tags || [];
  } catch (err: unknown) {
    console.error("Failed to load entry:", err);
    error.value = err instanceof Error ? err.message : "Failed to load entry";
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadEntry);

// Format date for datetime-local input
function formatDatetimeLocal(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Save changes
async function saveEntry() {
  if (!entry.value) return;

  isSaving.value = true;
  try {
    await $fetch(`/api/entries/${entryId}`, {
      method: "PATCH",
      body: {
        name: name.value,
        notes: notes.value || null,
        timestamp: new Date(timestamp.value).toISOString(),
        tags: tags.value.length > 0 ? tags.value : null,
      },
    });

    // Navigate back to timeline
    navigateTo("/");
  } catch (err: unknown) {
    console.error("Failed to save entry:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    alert(`Failed to save entry: ${message}`);
  } finally {
    isSaving.value = false;
  }
}

// Delete entry
async function deleteEntry() {
  if (!entry.value) return;
  if (!confirm("Are you sure you want to delete this entry?")) return;

  isDeleting.value = true;
  try {
    await $fetch(`/api/entries/${entryId}`, {
      method: "DELETE",
    });

    // Navigate back to timeline
    navigateTo("/");
  } catch (err: unknown) {
    console.error("Failed to delete entry:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    alert(`Failed to delete entry: ${message}`);
  } finally {
    isDeleting.value = false;
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
        <div>
          <label
            class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
          >
            Date & Time
          </label>
          <input
            v-model="timestamp"
            type="datetime-local"
            class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-tada-500 dark:focus:ring-tada-500 focus:border-transparent"
          />
        </div>

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

        <!-- Entry metadata (read-only) -->
        <div class="pt-4 border-t border-stone-200 dark:border-stone-700">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-stone-500 dark:text-stone-400">Type:</span>
              <span class="ml-2 text-stone-700 dark:text-stone-300">{{
                entry.type
              }}</span>
            </div>
            <div v-if="entry.durationSeconds">
              <span class="text-stone-500 dark:text-stone-400">Duration:</span>
              <span class="ml-2 text-stone-700 dark:text-stone-300">
                {{ Math.floor(entry.durationSeconds / 60) }}m
                {{ entry.durationSeconds % 60 }}s
              </span>
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
