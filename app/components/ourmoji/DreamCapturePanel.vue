<script setup lang="ts">
/**
 * DreamCapturePanel (US6, T053-T055)
 *
 * Embeds the existing VoiceRecorder so dream capture inherits live
 * transcription and cloud fallback for free. Falls back to a manual
 * textarea if transcription fails or the user prefers to type.
 *
 * Emits `submit` when the user is ready to lock the dream — the
 * parent (DreamExperimentFlow) is responsible for posting to the
 * dream submission endpoint and transitioning to the guess step.
 */

import { useDreamExperimentFlow } from "~/composables/useDreamExperimentFlow";

interface Props {
  /** Disable the whole panel (e.g. while submitting). */
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  /** Fired when the user submits their dream (locks it). */
  submit: [text: string, mode: "voice" | "text"];
}>();

const flow = useDreamExperimentFlow();

function handleVoiceTranscription(text: string) {
  flow.setVoiceTranscription(text);
}

function handleVoiceComplete(_blob: Blob, _duration: number, text: string) {
  if (text.trim().length > 0) {
    flow.setVoiceTranscription(text);
  }
}

function handleVoiceError(message: string) {
  flow.fallbackToText(message);
}

function handleSubmit() {
  if (!flow.canSubmit.value) return;
  emit("submit", flow.dreamText.value.trim(), flow.captureMode.value);
}
</script>

<template>
  <section class="space-y-4">
    <header class="space-y-1">
      <h2 class="text-lg font-semibold">Record your dream</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Speak freely or type — every detail you can recall, however fragmented.
      </p>
    </header>

    <!-- Voice path -->
    <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <VoiceRecorder
        mode="journal"
        :disabled="disabled"
        @transcription="handleVoiceTranscription"
        @complete="handleVoiceComplete"
        @error="handleVoiceError"
      />
    </div>

    <!-- Manual text fallback (always editable) -->
    <div>
      <label class="block text-sm font-medium mb-1">Dream text</label>
      <textarea
        :value="flow.dreamText.value"
        :disabled="disabled"
        rows="6"
        class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm"
        :class="{ 'border-red-500': flow.overLimit.value }"
        placeholder="Or type your dream here…"
        @input="(e) => flow.setManualText((e.target as HTMLTextAreaElement).value)"
      />
      <div class="mt-1 flex items-center justify-between text-xs">
        <span
          v-if="flow.transcriptionError.value"
          class="text-amber-600 dark:text-amber-400"
        >
          Voice transcription unavailable — please type instead.
          <span class="text-gray-500">({{ flow.transcriptionError.value }})</span>
        </span>
        <span v-else class="text-gray-500">Capture: {{ flow.captureMode.value }}</span>
        <span
          :class="
            flow.overLimit.value
              ? 'text-red-600'
              : flow.nearLimit.value
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500'
          "
        >
          {{ flow.length.value }} / {{ flow.maxLength }}
        </span>
      </div>
    </div>

    <div class="flex justify-end">
      <button
        type="button"
        :disabled="disabled || !flow.canSubmit.value"
        class="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-purple-700"
        @click="handleSubmit"
      >
        Submit dream
      </button>
    </div>
  </section>
</template>
