<script setup lang="ts">
/**
 * VoiceReviewModal Component
 * Shows transcription for review before creating entry
 * @component voice/VoiceReviewModal
 */

import type { TranscriptionResult } from "~/types/voice";
import type {
  JournalSubtype,
  DetectionResult,
} from "~/composables/useJournalTypeDetection";

interface Props {
  /** Whether modal is visible */
  visible: boolean;
  /** Transcription result to review */
  transcription: TranscriptionResult | null;
  /** Recording duration in seconds */
  duration?: number;
  /** Mode: journal creates single entry, tada extracts multiple items */
  mode?: "journal" | "tada";
  /** Loading state (e.g., during save) */
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  duration: 0,
  mode: "journal",
  loading: false,
});

const emit = defineEmits<{
  /** User confirms the transcription */
  confirm: [text: string, subtype?: JournalSubtype];
  /** User wants to edit before confirming */
  edit: [text: string];
  /** User cancels/discards */
  cancel: [];
  /** User wants to re-record */
  reRecord: [];
}>();

// Journal type detection
const { detectJournalType } = useJournalTypeDetection();

// Editable text (copy of transcription)
const editableText = ref("");
const isEditing = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Detected journal type
const detectedType = ref<DetectionResult | null>(null);
const selectedSubtype = ref<JournalSubtype>("note");
const showSubtypeSelector = ref(false);

// Available subtypes for selection
const subtypeOptions: Array<{
  value: JournalSubtype;
  label: string;
  emoji: string;
}> = [
  { value: "note", label: "Note", emoji: "📝" },
  { value: "reflection", label: "Reflection", emoji: "💭" },
  { value: "dream", label: "Dream", emoji: "🌙" },
  { value: "gratitude", label: "Gratitude", emoji: "🙏" },
  { value: "memory", label: "Memory", emoji: "📸" },
];

// Initialize editable text when transcription changes
watch(
  () => props.transcription,
  (newVal) => {
    if (newVal) {
      editableText.value = newVal.text;
      isEditing.value = false;

      // Auto-detect journal type for journal mode
      if (props.mode === "journal") {
        detectedType.value = detectJournalType(newVal.text);
        selectedSubtype.value = detectedType.value.subtype;
      }
    }
  },
  { immediate: true },
);

// Format duration for display
const formattedDuration = computed(() => {
  const mins = Math.floor(props.duration / 60);
  const secs = Math.floor(props.duration % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
});

// Provider display name
const providerDisplay = computed(() => {
  switch (props.transcription?.provider) {
    case "web-speech":
      return "Browser";
    case "whisper-wasm":
      return "Local (Whisper)";
    case "whisper-cloud":
      return "Cloud (Groq)";
    default:
      return props.transcription?.provider || "Unknown";
  }
});

// Confidence display
const confidenceDisplay = computed(() => {
  const conf = props.transcription?.confidence || 0;
  if (conf >= 0.9) return { label: "High", class: "text-green-600" };
  if (conf >= 0.7) return { label: "Good", class: "text-emerald-600" };
  if (conf >= 0.5) return { label: "Fair", class: "text-amber-600" };
  return { label: "Low", class: "text-red-600" };
});

// Word count
const wordCount = computed(() => {
  return editableText.value.trim().split(/\s+/).filter(Boolean).length;
});

/**
 * Enable editing mode
 */
function enableEdit() {
  isEditing.value = true;
  nextTick(() => {
    textareaRef.value?.focus();
    // Move cursor to end
    if (textareaRef.value) {
      textareaRef.value.selectionStart = textareaRef.value.value.length;
    }
  });
}

/**
 * Handle confirm action
 */
function handleConfirm() {
  const text = editableText.value.trim();
  if (text) {
    emit("confirm", text, selectedSubtype.value);
  }
}

/**
 * Select a subtype
 */
function selectSubtype(subtype: JournalSubtype) {
  selectedSubtype.value = subtype;
  showSubtypeSelector.value = false;
}

/**
 * Handle keyboard shortcuts
 */
function handleKeydown(event: KeyboardEvent) {
  // Cmd/Ctrl + Enter to confirm
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    handleConfirm();
  }
  // Escape to cancel
  if (event.key === "Escape" && !isEditing.value) {
    emit("cancel");
  }
}

// Close on escape (when not editing)
onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="voice-review-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        @click.self="$emit('cancel')"
      >
        <div class="voice-review-modal">
          <!-- Header -->
          <div class="voice-review__header">
            <h2 id="review-title" class="voice-review__title">
              {{ mode === "tada" ? "🎯 Review Your Tadas" : "📝 Review Entry" }}
            </h2>
            <button
              type="button"
              class="voice-review__close"
              aria-label="Close"
              @click="$emit('cancel')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
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
          </div>

          <!-- Metadata -->
          <div class="voice-review__meta">
            <span class="voice-review__meta-item">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {{ formattedDuration }}
            </span>
            <span class="voice-review__meta-item">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {{ wordCount }} words
            </span>
            <span class="voice-review__meta-item">
              {{ providerDisplay }}
              <span :class="confidenceDisplay.class" class="ml-1">
                ({{ confidenceDisplay.label }})
              </span>
            </span>
          </div>

          <!-- Detected Type (Journal mode only) -->
          <div
            v-if="mode === 'journal' && detectedType"
            class="voice-review__type-detection"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  Detected as
                </span>
                <button
                  type="button"
                  class="voice-review__type-badge"
                  @click="showSubtypeSelector = !showSubtypeSelector"
                >
                  {{
                    subtypeOptions.find((s) => s.value === selectedSubtype)
                      ?.emoji
                  }}
                  {{
                    subtypeOptions.find((s) => s.value === selectedSubtype)
                      ?.label
                  }}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
              <span
                v-if="detectedType.confidence >= 0.7"
                class="text-xs text-green-600 dark:text-green-400"
              >
                {{ Math.round(detectedType.confidence * 100) }}% confident
              </span>
            </div>

            <!-- Subtype Selector Dropdown -->
            <div
              v-if="showSubtypeSelector"
              class="voice-review__subtype-selector"
            >
              <button
                v-for="option in subtypeOptions"
                :key="option.value"
                type="button"
                class="voice-review__subtype-option"
                :class="{
                  'voice-review__subtype-option--selected':
                    selectedSubtype === option.value,
                }"
                @click="selectSubtype(option.value)"
              >
                <span>{{ option.emoji }}</span>
                <span>{{ option.label }}</span>
              </button>
            </div>
          </div>

          <!-- Transcription Content -->
          <div class="voice-review__content">
            <!-- View Mode -->
            <div
              v-if="!isEditing"
              class="voice-review__text"
              @click="enableEdit"
            >
              <p v-if="editableText" class="whitespace-pre-wrap">
                {{ editableText }}
              </p>
              <p v-else class="text-gray-400 italic">
                No transcription available
              </p>
              <button
                type="button"
                class="voice-review__edit-hint"
                @click.stop="enableEdit"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Click to edit
              </button>
            </div>

            <!-- Edit Mode -->
            <textarea
              v-else
              ref="textareaRef"
              v-model="editableText"
              class="voice-review__textarea"
              placeholder="Edit your transcription..."
              rows="6"
              @blur="isEditing = false"
            />
          </div>

          <!-- Error Display -->
          <div
            v-if="transcription?.error"
            class="voice-review__error"
            role="alert"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {{ transcription.error }}
          </div>

          <!-- Actions -->
          <div class="voice-review__actions">
            <button
              type="button"
              class="voice-review__btn voice-review__btn--secondary"
              :disabled="loading"
              @click="$emit('reRecord')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
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
              Re-record
            </button>

            <div class="flex-1" />

            <button
              type="button"
              class="voice-review__btn voice-review__btn--ghost"
              :disabled="loading"
              @click="$emit('cancel')"
            >
              Discard
            </button>

            <button
              type="button"
              class="voice-review__btn voice-review__btn--primary"
              :disabled="!editableText.trim() || loading"
              @click="handleConfirm"
            >
              <template v-if="loading">
                <svg
                  class="animate-spin w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Saving...
              </template>
              <template v-else>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {{ mode === "tada" ? "Create Tadas" : "Create Entry" }}
              </template>
            </button>
          </div>

          <!-- Keyboard Hint -->
          <p class="voice-review__hint">
            Press <kbd>⌘</kbd> + <kbd>Enter</kbd> to confirm, <kbd>Esc</kbd> to
            cancel
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.voice-review-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center p-4
         bg-black/50 backdrop-blur-sm;
}

.voice-review-modal {
  @apply w-full max-w-lg bg-white rounded-2xl shadow-2xl
         flex flex-col max-h-[90vh] overflow-hidden;
}

.voice-review__header {
  @apply flex items-center justify-between p-4 border-b border-gray-100;
}

.voice-review__title {
  @apply text-lg font-semibold text-gray-900;
}

.voice-review__close {
  @apply p-1 text-gray-400 hover:text-gray-600 transition-colors rounded;
}

.voice-review__meta {
  @apply flex flex-wrap items-center gap-4 px-4 py-2 bg-gray-50 text-sm text-gray-600;
}

.voice-review__meta-item {
  @apply flex items-center gap-1;
}

.voice-review__content {
  @apply p-4 flex-1 overflow-y-auto;
}

.voice-review__text {
  @apply relative p-4 bg-gray-50 rounded-lg min-h-[120px]
         cursor-text hover:bg-gray-100 transition-colors;
}

.voice-review__edit-hint {
  @apply absolute bottom-2 right-2 flex items-center gap-1
         text-xs text-gray-400 hover:text-gray-600;
}

.voice-review__textarea {
  @apply w-full p-4 bg-gray-50 border border-gray-200 rounded-lg
         resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500
         focus:border-transparent;
}

.voice-review__error {
  @apply flex items-center gap-2 mx-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg;
}

.voice-review__actions {
  @apply flex items-center gap-2 p-4 border-t border-gray-100;
}

.voice-review__btn {
  @apply flex items-center gap-2 px-4 py-2 rounded-lg font-medium
         transition-all duration-200
         disabled:opacity-50 disabled:cursor-not-allowed;
}

.voice-review__btn--primary {
  @apply bg-emerald-500 text-white hover:bg-emerald-600
         focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2;
}

.voice-review__btn--secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.voice-review__btn--ghost {
  @apply text-gray-600 hover:bg-gray-100;
}

.voice-review__hint {
  @apply text-center text-xs text-gray-400 pb-3;
}

.voice-review__hint kbd {
  @apply px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono;
}

/* Type Detection */
.voice-review__type-detection {
  @apply px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-800;
}

.voice-review__type-badge {
  @apply inline-flex items-center gap-1.5 px-3 py-1.5 
         bg-white dark:bg-stone-700 rounded-lg 
         text-sm font-medium text-indigo-700 dark:text-indigo-300
         border border-indigo-200 dark:border-indigo-600
         hover:bg-indigo-50 dark:hover:bg-indigo-900/40
         transition-colors cursor-pointer;
}

.voice-review__subtype-selector {
  @apply mt-2 flex flex-wrap gap-2;
}

.voice-review__subtype-option {
  @apply inline-flex items-center gap-1.5 px-3 py-1.5
         bg-white dark:bg-stone-700 rounded-lg
         text-sm text-gray-700 dark:text-gray-300
         border border-gray-200 dark:border-gray-600
         hover:bg-gray-50 dark:hover:bg-stone-600
         transition-colors;
}

.voice-review__subtype-option--selected {
  @apply bg-indigo-100 dark:bg-indigo-900/50 
         border-indigo-300 dark:border-indigo-500
         text-indigo-700 dark:text-indigo-300;
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  @apply transition-all duration-200 ease-out;
}

.modal-enter-from,
.modal-leave-to {
  @apply opacity-0;
}

.modal-enter-from .voice-review-modal,
.modal-leave-to .voice-review-modal {
  @apply scale-95 opacity-0;
}
</style>
