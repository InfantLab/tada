<script setup lang="ts">
/**
 * VoiceEntryConfirmation - Review and confirm parsed voice entry
 *
 * Features:
 * - Shows parsed entry with editable fields
 * - Confidence indicator for each field
 * - Quick accept or edit workflow
 * - Integrates with natural language parser results
 *
 * Used after voice transcription to confirm entry before saving
 */
import type { ParsedEntry } from "~/utils/naturalLanguageParser";
import type { EntryMode } from "./EntryTypeToggle.vue";

const props = defineProps<{
  /** Parsed entry from natural language parser */
  parsed: ParsedEntry;
  /** Whether the confirmation is loading */
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: "confirm", edited: ParsedEntry): void;
  (e: "edit"): void;
  (e: "cancel"): void;
  (e: "save-draft", data: { input: Record<string, unknown>; parsedFrom: string; confidence: number }): void;
}>();

// Auto-save draft when user cancels (with unsaved changes)
const hasPendingChanges = computed(() => {
  return editedName.value || editedDuration.value || editedCount.value;
});

// Handle cancel with draft save option
function handleCancel() {
  // If there are pending changes, offer to save as draft
  if (hasPendingChanges.value) {
    const draftData = {
      input: {
        name: editedName.value || undefined,
        type: editedType.value,
        durationSeconds: editedDuration.value || undefined,
        count: editedCount.value || undefined,
        timestamp: new Date().toISOString(),
      },
      parsedFrom: props.parsed.originalText,
      confidence: props.parsed.confidence,
    };
    emit("save-draft", draftData);
  }
  emit("cancel");
}

// Local state for editing
const isEditing = ref(false);
const editedName = ref(props.parsed.input.name || "");
const editedType = ref<EntryMode>(
  (props.parsed.input.type as EntryMode) || "timed"
);
const editedDuration = ref<number | null>(props.parsed.input.durationSeconds || null);
const editedCount = ref<number | null>(props.parsed.input.count || null);

// Sync with prop changes
watch(
  () => props.parsed,
  (newParsed) => {
    editedName.value = newParsed.input.name || "";
    editedType.value = (newParsed.input.type as EntryMode) || "timed";
    editedDuration.value = newParsed.input.durationSeconds || null;
    editedCount.value = newParsed.input.count || null;
  }
);

// Format duration for display
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

// Confidence color
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-green-500 dark:text-green-400";
  if (confidence >= 0.5) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

// Handle confirm
function handleConfirm() {
  const editedParsed: ParsedEntry = {
    ...props.parsed,
    input: {
      ...props.parsed.input,
      name: editedName.value,
      type: editedType.value,
      durationSeconds: editedDuration.value || undefined,
      count: editedCount.value || undefined,
    },
  };
  emit("confirm", editedParsed);
}

// Handle edit mode toggle
function toggleEdit() {
  isEditing.value = !isEditing.value;
  if (isEditing.value) {
    emit("edit");
  }
}
</script>

<template>
  <div class="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
    <!-- Header -->
    <div class="px-4 py-3 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
      <div class="flex items-center justify-between">
        <h3 class="font-medium text-stone-900 dark:text-white">
          Confirm Entry
        </h3>
        <div class="flex items-center gap-2">
          <span
            class="text-xs"
            :class="getConfidenceColor(parsed.confidence)"
          >
            {{ Math.round(parsed.confidence * 100) }}% confident
          </span>
        </div>
      </div>
      <p class="text-sm text-stone-500 dark:text-stone-400 mt-1 truncate">
        "{{ parsed.originalText }}"
      </p>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-3">
      <!-- Entry type -->
      <div class="flex items-center justify-between">
        <span class="text-sm text-stone-500 dark:text-stone-400">Type</span>
        <div v-if="isEditing">
          <EntryTypeToggle v-model="editedType" :compact="true" />
        </div>
        <span v-else class="text-sm font-medium text-stone-900 dark:text-white">
          {{ editedType === "timed" ? "⏱️ Timed" : editedType === "reps" ? "🔢 Count" : "✨ Moment" }}
        </span>
      </div>

      <!-- Activity name -->
      <div class="flex items-center justify-between">
        <span class="text-sm text-stone-500 dark:text-stone-400">Activity</span>
        <input
          v-if="isEditing"
          v-model="editedName"
          type="text"
          class="w-32 px-2 py-1 text-sm rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white text-right"
        />
        <span
          v-else
          class="text-sm font-medium text-stone-900 dark:text-white"
          :class="{ 'text-stone-400 italic': !editedName }"
        >
          {{ editedName || "Not detected" }}
        </span>
      </div>

      <!-- Duration (for timed) -->
      <div v-if="editedType === 'timed'" class="flex items-center justify-between">
        <span class="text-sm text-stone-500 dark:text-stone-400">Duration</span>
        <input
          v-if="isEditing"
          v-model.number="editedDuration"
          type="number"
          min="0"
          class="w-20 px-2 py-1 text-sm rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white text-right"
          placeholder="seconds"
        />
        <span
          v-else
          class="text-sm font-medium text-stone-900 dark:text-white"
          :class="{ 'text-stone-400 italic': !editedDuration }"
        >
          {{ editedDuration ? formatDuration(editedDuration) : "Not detected" }}
        </span>
      </div>

      <!-- Count (for reps) -->
      <div v-if="editedType === 'reps'" class="flex items-center justify-between">
        <span class="text-sm text-stone-500 dark:text-stone-400">Count</span>
        <input
          v-if="isEditing"
          v-model.number="editedCount"
          type="number"
          min="1"
          class="w-20 px-2 py-1 text-sm rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white text-right"
        />
        <span
          v-else
          class="text-sm font-medium text-stone-900 dark:text-white"
          :class="{ 'text-stone-400 italic': !editedCount }"
        >
          {{ editedCount || "Not detected" }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 px-4 py-3 bg-stone-50 dark:bg-stone-800/50 border-t border-stone-200 dark:border-stone-700">
      <button
        type="button"
        :disabled="isLoading"
        class="flex-1 px-3 py-2 text-sm font-medium rounded-lg text-stone-700 dark:text-stone-300 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 disabled:opacity-50 transition-colors"
        @click="handleCancel"
      >
        {{ hasPendingChanges ? "Save Draft" : "Cancel" }}
      </button>
      <button
        type="button"
        :disabled="isLoading"
        class="flex-1 px-3 py-2 text-sm font-medium rounded-lg text-stone-700 dark:text-stone-300 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 disabled:opacity-50 transition-colors"
        @click="toggleEdit"
      >
        {{ isEditing ? "Done" : "Edit" }}
      </button>
      <button
        type="button"
        :disabled="isLoading || !editedName"
        class="flex-1 px-3 py-2 text-sm font-medium rounded-lg text-white bg-tada-600 hover:bg-tada-700 disabled:opacity-50 transition-colors"
        @click="handleConfirm"
      >
        <span v-if="isLoading">Saving...</span>
        <span v-else>Save</span>
      </button>
    </div>
  </div>
</template>
