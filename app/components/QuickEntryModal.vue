<script setup lang="ts">
/**
 * QuickEntryModal - Unified modal for quick entry creation
 *
 * Features:
 * - Past timer entry: Log a timed session that already happened
 * - Count entry: Log reps/counts for exercises (Phase 5)
 * - Moment capture: Quick note/thought (Phase 8)
 * - Conflict detection with warnings
 * - Smart defaults from user history
 *
 * Philosophy: "One engine, many faces" - single modal, multiple modes
 */
import type { EntryMode } from "./EntryTypeToggle.vue";
import type { DurationContext } from "./DurationPicker.vue";
import type { EntryInput } from "~/utils/entrySchemas";
import type { CreateEntryOptions } from "~/composables/useEntryEngine";

const props = withDefaults(
  defineProps<{
    /** Whether the modal is open */
    open: boolean;
    /** Initial mode to show */
    initialMode?: EntryMode;
    /** Pre-fill activity name */
    initialName?: string;
    /** Pre-fill category */
    initialCategory?: string;
    /** Context for duration presets */
    durationContext?: DurationContext;
    /** Draft to resume (from DraftIndicator) */
    resumeDraft?: {
      id: string;
      input: Record<string, unknown>;
      parsedFrom?: string | null;
    } | null;
  }>(),
  {
    initialMode: "timed",
    initialName: "",
    initialCategory: "",
    durationContext: "general",
    resumeDraft: null,
  },
);

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "saved", entry: EntryInput): void;
  (e: "close"): void;
}>();

// Entry engine for saving
const { createEntry, checkConflicts, isLoading } = useEntryEngine();
const toast = useToast();

// Form state
const mode = ref<EntryMode>(props.initialMode);
const name = ref(props.initialName);
const category = ref(props.initialCategory);
const timestamp = ref(new Date().toISOString());
const durationSeconds = ref<number | null>(null);
const count = ref<number | null>(null);
const notes = ref("");

// Draft tracking
const resumingDraftId = ref<string | null>(null);
const showDraftBanner = ref(false);

// Conflict state
const conflicts = ref<{
  hasConflict: boolean;
  overlappingEntries: Array<{
    id: string;
    name: string;
    emoji?: string;
    timestamp: string;
    durationSeconds?: number;
  }>;
  suggestedResolution: string;
} | null>(null);
const conflictResolution = ref<"allow-both" | "replace" | null>(null);

// Reset form when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      // Check if resuming from draft
      if (props.resumeDraft) {
        const draft = props.resumeDraft;
        resumingDraftId.value = draft.id;
        showDraftBanner.value = true;

        // Populate from draft
        const input = draft.input;
        mode.value = (input["type"] as EntryMode) || props.initialMode;
        name.value = (input["name"] as string) || props.initialName;
        category.value = (input["category"] as string) || props.initialCategory;
        timestamp.value =
          (input["timestamp"] as string) || new Date().toISOString();
        durationSeconds.value = (input["durationSeconds"] as number) || null;
        count.value = (input["count"] as number) || null;
        notes.value = (input["notes"] as string) || "";
      } else {
        // Normal reset
        resumingDraftId.value = null;
        showDraftBanner.value = false;
        mode.value = props.initialMode;
        name.value = props.initialName;
        category.value = props.initialCategory;
        timestamp.value = new Date().toISOString();
        durationSeconds.value = null;
        count.value = null;
        notes.value = "";
      }
      conflicts.value = null;
      conflictResolution.value = null;
    }
  },
);

// Check for conflicts when timestamp or duration changes (for timed entries)
// Watch for changes that might cause conflicts (debounced)
let conflictCheckTimeout: ReturnType<typeof setTimeout> | null = null;
watch([timestamp, durationSeconds, mode], async () => {
  if (mode.value !== "timed" || !durationSeconds.value) {
    conflicts.value = null;
    return;
  }

  // Debounce conflict check
  if (conflictCheckTimeout) {
    clearTimeout(conflictCheckTimeout);
  }
  conflictCheckTimeout = setTimeout(async () => {
    // Build a temporary entry input for conflict check
    const entryInput = buildEntryInput();
    try {
      const result = await checkConflicts(entryInput);
      conflicts.value = result || null;
    } catch {
      conflicts.value = null;
    }
  }, 500);
});

// Compute if form is valid
const isValid = computed(() => {
  if (!name.value.trim()) return false;

  switch (mode.value) {
    case "timed":
      return durationSeconds.value !== null && durationSeconds.value > 0;
    case "reps":
      return count.value !== null && count.value > 0;
    case "moment":
      return true; // Just need a name
    default:
      return false;
  }
});

// Build entry input from form state
function buildEntryInput(): EntryInput {
  const baseEntry = {
    name: name.value.trim(),
    category: category.value.trim() || undefined,
    timestamp: timestamp.value,
    notes: notes.value.trim() || undefined,
    source: "manual" as const,
  };

  switch (mode.value) {
    case "timed": {
      // Calculate startedAt from timestamp and duration
      const endTime = new Date(timestamp.value);
      const startTime = new Date(
        endTime.getTime() - (durationSeconds.value || 0) * 1000,
      );
      return {
        ...baseEntry,
        type: "timed",
        durationSeconds: durationSeconds.value || 0,
        data: {
          startedAt: startTime.toISOString(),
          endedAt: endTime.toISOString(),
        },
      };
    }
    case "reps":
      return {
        ...baseEntry,
        type: "reps",
        count: count.value || 0,
        data: {
          count: count.value || 0,
        },
      };
    case "moment":
      return {
        ...baseEntry,
        type: "journal",
        content: notes.value.trim() || name.value.trim(),
        data: {},
      };
  }
}

// Save entry
async function handleSave(resolution?: "allow-both" | "replace") {
  if (!isValid.value || isLoading.value) return;

  try {
    const entryInput = buildEntryInput();

    // Determine resolution based on conflict state
    const saveOptions: CreateEntryOptions = { skipEmojiResolution: false };
    if (resolution === "replace") {
      saveOptions.resolution = "replace";
    } else if (
      resolution === "allow-both" ||
      conflictResolution.value === "allow-both"
    ) {
      saveOptions.resolution = "allow-both";
    }

    const result = await createEntry(entryInput, saveOptions);

    if (result) {
      // If resuming from draft, delete the draft
      if (resumingDraftId.value) {
        try {
          await $fetch<{ success: boolean }>(
            `/api/entries/drafts/${resumingDraftId.value}`,
            {
              method: "DELETE",
            },
          );
        } catch {
          // Draft deletion is not critical, don't fail the save
          console.warn("Failed to delete draft after save");
        }
      }

      toast.success("Entry saved!");
      emit("saved", entryInput);
      closeModal();
    }
  } catch (error) {
    console.error("Failed to save entry:", error);
    toast.error("Failed to save entry");
  }
}

// Handle conflict resolution from ConflictWarning component
function handleConflictResolve(action: "allow-both" | "replace" | "cancel") {
  if (action === "cancel") {
    closeModal();
    return;
  }

  conflictResolution.value = action;
  handleSave(action);
}

// Close modal
function closeModal() {
  emit("update:open", false);
  emit("close");
}

// Handle escape key
function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeModal();
  }
}

// Mode labels for header
const modeLabels: Record<EntryMode, string> = {
  timed: "Log Past Session",
  reps: "Log Activity",
  moment: "Quick Note",
};
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        @keydown="handleKeydown"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="closeModal"
        />

        <!-- Modal -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-full sm:translate-y-0 sm:scale-95 opacity-0"
          enter-to-class="translate-y-0 sm:scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 sm:scale-100 opacity-100"
          leave-to-class="translate-y-full sm:translate-y-0 sm:scale-95 opacity-0"
        >
          <div
            v-if="open"
            class="relative w-full sm:max-w-md mx-auto bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            <!-- Header -->
            <div
              class="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700"
            >
              <h2 class="text-lg font-semibold text-stone-900 dark:text-white">
                {{ modeLabels[mode] }}
              </h2>
              <button
                type="button"
                class="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                @click="closeModal"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- Draft Resume Banner -->
            <div
              v-if="showDraftBanner"
              class="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800"
            >
              <div class="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span class="text-sm text-amber-700 dark:text-amber-300">
                  Resuming saved draft
                </span>
                <button
                  type="button"
                  class="ml-auto text-xs text-amber-600 dark:text-amber-400 hover:underline"
                  @click="showDraftBanner = false"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <!-- Content -->
            <div class="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <!-- Mode toggle -->
              <div class="flex justify-center">
                <EntryTypeToggle v-model="mode" />
              </div>

              <!-- Activity name -->
              <div class="space-y-1">
                <label
                  class="block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  What did you do?
                </label>
                <input
                  v-model="name"
                  type="text"
                  placeholder="Meditation, Push-ups, etc."
                  class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-tada-500 focus:border-transparent"
                />
              </div>

              <!-- Category (optional) -->
              <div class="space-y-1">
                <label
                  class="block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Category
                  <span class="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  v-model="category"
                  type="text"
                  placeholder="Exercise, Mindfulness, etc."
                  class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-tada-500 focus:border-transparent"
                />
              </div>

              <!-- Duration (timed mode) -->
              <DurationPicker
                v-if="mode === 'timed'"
                v-model="durationSeconds"
                :context="durationContext"
                label="How long?"
              />

              <!-- Count (reps mode) -->
              <div v-if="mode === 'reps'" class="space-y-1">
                <label
                  class="block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  How many?
                </label>
                <QuickValuePicker
                  v-model="count"
                  :quick-picks="[5, 10, 15, 20, 25, 30, 40, 50]"
                  :step-small="1"
                  :step-large="5"
                  :min="1"
                  placeholder="Enter count"
                  unit="reps"
                />
              </div>

              <!-- When -->
              <DateTimePicker v-model="timestamp" label="When?" />

              <!-- Conflict Warning -->
              <ConflictWarning
                v-if="conflicts && conflicts.hasConflict"
                :conflict="conflicts"
                :is-loading="isLoading"
                @resolve="handleConflictResolve"
              />

              <!-- Notes (optional) -->
              <div class="space-y-1">
                <label
                  class="block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Notes
                  <span class="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  v-model="notes"
                  :rows="2"
                  :placeholder="
                    mode === 'moment'
                      ? 'What\'s on your mind?'
                      : 'Any notes about this session?'
                  "
                  class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-tada-500 focus:border-transparent resize-none"
                />
              </div>

              <!-- Attachment Placeholder -->
              <div class="flex justify-start">
                <AttachmentPlaceholder />
              </div>
            </div>

            <!-- Footer -->
            <div
              class="flex gap-3 px-4 py-3 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50"
            >
              <button
                type="button"
                class="flex-1 px-4 py-2 rounded-lg font-medium text-stone-700 dark:text-stone-300 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
                @click="closeModal"
              >
                Cancel
              </button>
              <button
                type="button"
                :disabled="!isValid || isLoading"
                class="flex-1 px-4 py-2 rounded-lg font-medium text-white bg-tada-600 hover:bg-tada-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                @click="handleSave()"
              >
                <span v-if="isLoading">Saving...</span>
                <span v-else>Save</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
