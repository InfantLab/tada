<script setup lang="ts">
/**
 * VoiceTallyRecorder Component
 * Voice recorder specialized for tally entries - extracts counts from speech
 * Uses rule-based extraction first, with LLM fallback for complex cases
 *
 * Example: "10 push-ups, 12 kettlebells and 30 squats" ->
 *   [{ activity: "push-ups", count: 10 }, { activity: "kettlebells", count: 12 }, ...]
 *
 * @component voice/VoiceTallyRecorder
 */
import type { ExtractedTally } from "~/utils/tallyExtractor";
import { extractTalliesRuleBased } from "~/utils/tallyExtractor";

interface Props {
  /** Disabled state */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  /** Emitted when tallies are extracted from speech */
  tallies: [tallies: ExtractedTally[]];
  /** Emitted when no tallies found but have raw transcription */
  noTallies: [transcription: string];
  /** Emitted on error */
  error: [message: string];
}>();

// State
const isExtracting = ref(false);
const extractedTallies = ref<ExtractedTally[]>([]);
const lastTranscription = ref("");
const showResults = ref(false);

/**
 * Handle voice recording completion
 */
async function handleVoiceComplete(
  _blob: Blob,
  _duration: number,
  transcription: string,
) {
  if (!transcription?.trim()) {
    emit("error", "No speech detected. Please try again.");
    return;
  }

  lastTranscription.value = transcription;
  isExtracting.value = true;

  try {
    // Try rule-based extraction first
    const result = extractTalliesRuleBased(transcription);

    if (result.tallies.length > 0) {
      // Calculate average confidence
      const avgConfidence =
        result.tallies.reduce((acc, t) => acc + t.confidence, 0) /
        result.tallies.length;

      if (avgConfidence >= 0.5) {
        // Good extraction - use it directly
        extractedTallies.value = result.tallies;
        showResults.value = true;
        emit("tallies", result.tallies);
      } else {
        // Low confidence - could try LLM, but for now use what we have
        // TODO: Add LLM fallback when API is integrated
        extractedTallies.value = result.tallies;
        showResults.value = true;
        emit("tallies", result.tallies);
      }
    } else {
      // No tallies found
      showResults.value = false;
      emit("noTallies", transcription);
    }
  } catch (err) {
    console.error("[VoiceTallyRecorder] Extraction error:", err);
    emit("error", "Failed to extract tallies from speech");
  } finally {
    isExtracting.value = false;
  }
}

/**
 * Handle voice recording error
 */
function handleVoiceError(message: string) {
  emit("error", message);
}

/**
 * Handle voice cancellation
 */
function handleVoiceCancel() {
  showResults.value = false;
  extractedTallies.value = [];
  lastTranscription.value = "";
}

/**
 * Remove a tally from the list
 */
function removeTally(index: number) {
  extractedTallies.value = extractedTallies.value.filter((_, i) => i !== index);
  if (extractedTallies.value.length === 0) {
    showResults.value = false;
  } else {
    emit("tallies", extractedTallies.value);
  }
}

/**
 * Clear all extracted tallies
 */
function clearTallies() {
  extractedTallies.value = [];
  showResults.value = false;
  lastTranscription.value = "";
}

/**
 * Confirm and emit the current tallies
 */
function confirmTallies() {
  if (extractedTallies.value.length > 0) {
    emit("tallies", extractedTallies.value);
    clearTallies();
  }
}

// Expose methods for parent component
defineExpose({
  clearTallies,
  extractedTallies,
});
</script>

<template>
  <div class="voice-tally-recorder">
    <!-- Voice recorder -->
    <VoiceRecorder
      mode="tada"
      :disabled="props.disabled || isExtracting"
      @complete="handleVoiceComplete"
      @error="handleVoiceError"
      @cancel="handleVoiceCancel"
    />

    <!-- Extracting indicator -->
    <div
      v-if="isExtracting"
      class="mt-4 flex items-center justify-center gap-2 text-stone-500 dark:text-stone-400"
    >
      <div
        class="h-4 w-4 animate-spin rounded-full border-2 border-tada-500 border-t-transparent"
      />
      <span class="text-sm">Extracting counts...</span>
    </div>

    <!-- Extracted tallies preview -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="showResults && extractedTallies.length > 0"
        class="mt-4 rounded-lg border border-tada-200 bg-tada-50 p-4 dark:border-tada-800 dark:bg-tada-900/20"
      >
        <!-- Header -->
        <div class="mb-3 flex items-center justify-between">
          <h4 class="text-sm font-medium text-stone-700 dark:text-stone-200">
            Found {{ extractedTallies.length }}
            {{ extractedTallies.length === 1 ? "activity" : "activities" }}
          </h4>
          <button
            type="button"
            class="text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            @click="clearTallies"
          >
            Clear all
          </button>
        </div>

        <!-- Tallies list -->
        <div class="space-y-2">
          <div
            v-for="(tally, index) in extractedTallies"
            :key="index"
            class="flex items-center gap-3 rounded-lg bg-white p-2 dark:bg-stone-800"
          >
            <!-- Count badge -->
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-tada-100 dark:bg-tada-900/40"
            >
              <span class="text-lg font-bold text-tada-700 dark:text-tada-300">
                {{ tally.count }}
              </span>
            </div>

            <!-- Activity info -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span v-if="tally.emoji" class="text-lg">{{
                  tally.emoji
                }}</span>
                <span
                  class="truncate font-medium text-stone-800 dark:text-stone-100"
                >
                  {{ tally.activity }}
                </span>
              </div>
              <span
                v-if="tally.category"
                class="text-xs text-stone-500 dark:text-stone-400"
              >
                {{ tally.category }}
              </span>
            </div>

            <!-- Remove button -->
            <button
              type="button"
              class="flex-shrink-0 rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-200"
              title="Remove"
              @click="removeTally(index)"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Original transcription -->
        <div class="mt-3 border-t border-stone-200 pt-3 dark:border-stone-700">
          <p class="text-xs text-stone-500 dark:text-stone-400">
            <span class="font-medium">You said:</span>
            "{{ lastTranscription }}"
          </p>
        </div>

        <!-- Confirm button -->
        <button
          type="button"
          class="mt-4 w-full rounded-lg bg-tada-600 py-2 font-medium text-white transition-colors hover:bg-tada-700"
          @click="confirmTallies"
        >
          Add {{ extractedTallies.length }}
          {{ extractedTallies.length === 1 ? "Tally" : "Tallies" }}
        </button>
      </div>
    </Transition>
  </div>
</template>
