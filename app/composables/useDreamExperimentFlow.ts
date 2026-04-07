/**
 * useDreamExperimentFlow — receiver-side morning flow state (US3 + US6).
 *
 * Phase 6 introduces the dream-text + capture-mode state used by
 * DreamCapturePanel. Phase 7 will expand this with guess + reveal
 * state, but the dream slice is independently testable today.
 *
 * Capture modes:
 *   - "voice": text was produced by VoiceRecorder transcription
 *   - "text":  user typed/edited the text manually
 *
 * The composable also exposes a `nearLimit` flag for the soft warning
 * threshold (90% of MAX_TEXT_LENGTH) so the UI can hint without
 * blocking submission.
 */

import { computed, ref } from "vue";
import { MAX_TEXT_LENGTH } from "~/utils/ourmoji/constants";

export type DreamCaptureMode = "voice" | "text";

export function useDreamExperimentFlow() {
  const dreamText = ref("");
  const captureMode = ref<DreamCaptureMode>("text");
  const transcriptionError = ref<string | null>(null);

  const length = computed(() => dreamText.value.length);
  const overLimit = computed(() => length.value > MAX_TEXT_LENGTH);
  const nearLimit = computed(
    () => length.value >= Math.floor(MAX_TEXT_LENGTH * 0.9),
  );
  const canSubmit = computed(
    () => dreamText.value.trim().length > 0 && !overLimit.value,
  );

  function setVoiceTranscription(text: string) {
    dreamText.value = text;
    captureMode.value = "voice";
    transcriptionError.value = null;
  }

  function setManualText(text: string) {
    dreamText.value = text;
    captureMode.value = "text";
  }

  function fallbackToText(error: string) {
    transcriptionError.value = error;
    captureMode.value = "text";
    // Preserve any partial text already in the box.
  }

  function reset() {
    dreamText.value = "";
    captureMode.value = "text";
    transcriptionError.value = null;
  }

  return {
    dreamText,
    captureMode,
    transcriptionError,
    length,
    overLimit,
    nearLimit,
    canSubmit,
    maxLength: MAX_TEXT_LENGTH,
    setVoiceTranscription,
    setManualText,
    fallbackToText,
    reset,
  };
}
