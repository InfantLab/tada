<script setup lang="ts">
/**
 * VoiceRecorder Component
 * Main recording button with visual feedback for voice input
 * @component voice/VoiceRecorder
 */

import {
  supportsWebSpeech,
  supportsMediaRecorder,
  getBrowserName,
} from "~/utils/voiceBrowserSupport";

interface Props {
  /** Recording mode: journal or tada */
  mode?: "journal" | "tada";
  /** Compact variant for inline use (e.g., timer page) */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Auto-start recording when component mounts */
  autostart?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  mode: "journal",
  compact: false,
  disabled: false,
  autostart: false,
});

const emit = defineEmits<{
  /** Emitted when recording completes with audio blob and transcription */
  complete: [blob: Blob, duration: number, transcription: string];
  /** Emitted when recording is cancelled */
  cancel: [];
  /** Emitted on error */
  error: [message: string];
  /** Emitted with live transcription text during recording */
  transcription: [text: string];
}>();

// Composables
const voiceCapture = useVoiceCapture();
const voiceSettings = useVoiceSettings();
const transcription = useTranscription();

// Local state
const showUnsupportedMessage = ref(false);
const showPrivacyDisclosure = ref(false);
const pendingRecordStart = ref(false);
const liveText = ref("");

// Browser support check
const isSupported = computed(() => {
  if (typeof window === "undefined") return true;
  return supportsMediaRecorder();
});

const browserName = computed(() => getBrowserName());
const hasWebSpeech = computed(() => supportsWebSpeech());

// Audio level bars (5 bars for visualization)
const levelBars = computed(() => {
  const level = voiceCapture.audioLevel.value;
  return [level > 0.1, level > 0.25, level > 0.45, level > 0.65, level > 0.85];
});

// Auto-start recording if requested
onMounted(async () => {
  if (props.autostart && !props.disabled) {
    // Small delay to ensure component is fully mounted
    await new Promise(resolve => setTimeout(resolve, 100));
    await handleMicClick();
  }
});

/**
 * Handle microphone button click
 */
async function handleMicClick() {
  if (props.disabled) return;

  if (!isSupported.value) {
    showUnsupportedMessage.value = true;
    return;
  }

  // Check if privacy disclosure needs to be shown
  if (!voiceSettings.hasSeenPrivacyDisclosure.value) {
    showPrivacyDisclosure.value = true;
    pendingRecordStart.value = true;
    return;
  }

  await startOrStopRecording();
}

/**
 * Start or stop recording
 */
async function startOrStopRecording() {
  if (voiceCapture.isRecording.value) {
    // Stop recording and live transcription
    transcription.stopLiveTranscription();
    voiceCapture.stopRecording();
  } else {
    // Start recording first
    const success = await voiceCapture.startRecording();
    if (!success && voiceCapture.error.value) {
      emit("error", voiceCapture.error.value);
      return;
    }

    // Small delay to ensure microphone is fully active before starting speech recognition
    // This helps avoid race conditions between MediaRecorder and Web Speech API
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Start live transcription in parallel
    liveText.value = "";
    await transcription.startLiveTranscription({
      onInterim: (text) => {
        liveText.value = text;
      },
    });
  }
}

/**
 * Handle privacy disclosure acceptance
 */
async function handlePrivacyAccept() {
  showPrivacyDisclosure.value = false;
  voiceSettings.markPrivacyDisclosureSeen();

  if (pendingRecordStart.value) {
    pendingRecordStart.value = false;
    await startOrStopRecording();
  }
}

/**
 * Handle privacy disclosure decline
 */
function handlePrivacyDecline() {
  showPrivacyDisclosure.value = false;
  pendingRecordStart.value = false;
}

/**
 * Handle "don't show again" preference
 */
function handleDontShowAgain() {
  voiceSettings.markPrivacyDisclosureSeen();
}

/**
 * Cancel current recording
 */
function handleCancel() {
  transcription.stopLiveTranscription();
  voiceCapture.cancelRecording();
  liveText.value = "";
  emit("cancel");
}

// Watch for recording completion
watch(
  () => voiceCapture.audioBlob.value,
  async (blob) => {
    if (blob) {
      // Get the best available transcription text
      // Priority: result.text (includes final+interim), liveText (last interim from callback),
      // liveTranscript (ref from composable), or empty
      const resultText = transcription.result.value?.text || "";
      const transcriptText = transcription.liveTranscript.value || "";
      let finalText = resultText || liveText.value || transcriptText || "";

      console.log(
        `[VoiceRecorder] Recording complete, evaluating transcription`,
        {
          timestamp: new Date().toISOString(),
          blobSize: blob.size,
          blobType: blob.type,
          duration: voiceCapture.duration.value,
          resultText: resultText ? resultText.slice(0, 50) + "..." : "(empty)",
          liveTextValue: liveText.value
            ? liveText.value.slice(0, 50) + "..."
            : "(empty)",
          transcriptText: transcriptText
            ? transcriptText.slice(0, 50) + "..."
            : "(empty)",
          finalText: finalText ? finalText.slice(0, 50) + "..." : "(empty)",
          transcriptionStatus: transcription.status.value,
          transcriptionError: transcription.error.value,
        },
      );

      // If we have text, emit and return
      if (finalText.trim()) {
        console.log(
          `[VoiceRecorder] Success - emitting transcription: "${finalText.slice(0, 80)}..."`,
        );
        emit("transcription", finalText.trim());
        emit("complete", blob, voiceCapture.duration.value, finalText.trim());
        liveText.value = "";
        return;
      }

      console.log(
        `[VoiceRecorder] No text captured, attempting Whisper fallback`,
      );
      // No text captured - try Whisper fallback if available
      const hasApiKey = voiceSettings.hasApiKey("groq");
      if (hasApiKey) {
        try {
          const whisperResult = await transcription.transcribe(blob, {
            forceProvider: "whisper-cloud",
          });
          if (whisperResult?.text) {
            finalText = whisperResult.text;
            emit("transcription", finalText.trim());
            emit(
              "complete",
              blob,
              voiceCapture.duration.value,
              finalText.trim(),
            );
            liveText.value = "";
            return;
          }
        } catch {
          // Whisper fallback failed, continue to error handling
        }
      }

      // Still no text - emit appropriate error
      let errorMessage: string;
      const errorLower = (transcription.error.value || "").toLowerCase();

      if (voiceCapture.duration.value < 1) {
        errorMessage =
          "Recording was too short. Hold the button longer and speak clearly.";
      } else if (errorLower.includes("network")) {
        errorMessage =
          "Speech recognition temporarily unavailable. Try speaking in shorter segments or check your internet connection.";
      } else if (
        errorLower.includes("not-allowed") ||
        errorLower.includes("denied")
      ) {
        errorMessage =
          "Microphone access denied. Please allow microphone access in browser settings.";
      } else if (transcription.error.value) {
        errorMessage = transcription.error.value;
      } else {
        errorMessage =
          "No speech detected. Please speak clearly into the microphone and try again.";
      }

      emit("error", errorMessage);
      liveText.value = "";
    }
  },
);

// Watch for errors from voice capture (microphone issues)
watch(
  () => voiceCapture.error.value,
  (err) => {
    if (err) {
      emit("error", err);
    }
  },
);

// Watch for transcription errors - only emit if critical and no text captured
watch(
  () => transcription.error.value,
  (_err) => {
    // Don't emit error here - we handle it in the audioBlob watcher
    // This prevents duplicate errors and allows fallback to work
  },
);

/**
 * Handle keyboard shortcuts
 * Space: Start/stop recording (when focused)
 * Escape: Cancel recording
 */
function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return;

  // Space to toggle recording
  if (event.code === "Space" || event.key === " ") {
    event.preventDefault();
    handleMicClick();
  }

  // Escape to cancel
  if (
    (event.code === "Escape" || event.key === "Escape") &&
    voiceCapture.isRecording.value
  ) {
    event.preventDefault();
    handleCancel();
  }
}

// Screen reader announcements
const statusAnnouncement = computed(() => {
  if (voiceCapture.isRecording.value) {
    const seconds = Math.floor(voiceCapture.duration.value / 1000);
    return `Recording in progress. ${seconds} seconds elapsed.`;
  }
  if (voiceCapture.status.value === "error") {
    return `Error: ${voiceCapture.error.value || "Recording failed"}`;
  }
  return "Ready to record. Press Space or click to start.";
});
</script>

<template>
  <div
    class="voice-recorder"
    :class="{
      'voice-recorder--compact': compact,
      'voice-recorder--recording': voiceCapture.isRecording.value,
      'voice-recorder--disabled': disabled,
    }"
    tabindex="0"
    role="region"
    aria-label="Voice recorder"
    @keydown="handleKeydown"
  >
    <!-- Screen reader status announcement -->
    <span class="sr-only" aria-live="polite" aria-atomic="true">
      {{ statusAnnouncement }}
    </span>

    <!-- Main Recording Button -->
    <button
      type="button"
      class="voice-recorder__button"
      :class="{
        'voice-recorder__button--recording': voiceCapture.isRecording.value,
        'voice-recorder__button--error': voiceCapture.status.value === 'error',
      }"
      :disabled="disabled || !isSupported"
      :aria-label="
        voiceCapture.isRecording.value
          ? 'Stop recording'
          : 'Start voice recording'
      "
      @click="handleMicClick"
    >
      <!-- Mic Icon (idle) -->
      <svg
        v-if="!voiceCapture.isRecording.value"
        xmlns="http://www.w3.org/2000/svg"
        class="voice-recorder__icon"
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

      <!-- Stop Icon (recording) -->
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        class="voice-recorder__icon voice-recorder__icon--stop"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>

      <!-- Pulsing ring animation when recording -->
      <span
        v-if="voiceCapture.isRecording.value"
        class="voice-recorder__pulse"
      />
    </button>

    <!-- Recording Info (shown when recording) -->
    <div
      v-if="voiceCapture.isRecording.value && !compact"
      class="voice-recorder__info"
    >
      <!-- Audio Level Bars -->
      <div class="voice-recorder__levels" aria-hidden="true">
        <div
          v-for="(active, i) in levelBars"
          :key="i"
          class="voice-recorder__level-bar"
          :class="{ 'voice-recorder__level-bar--active': active }"
        />
      </div>

      <!-- Duration -->
      <span class="voice-recorder__duration">
        {{ voiceCapture.formattedDuration.value }}
      </span>

      <!-- Cancel Button -->
      <button
        type="button"
        class="voice-recorder__cancel"
        aria-label="Cancel recording"
        @click="handleCancel"
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Mode Toggle (Journal/Tada) -->
    <div
      v-if="!compact && !voiceCapture.isRecording.value"
      class="voice-recorder__mode"
    >
      <span class="text-xs text-gray-500">
        {{ mode === "tada" ? "🎯 Tada mode" : "📝 Journal mode" }}
      </span>
    </div>

    <!-- Error Message -->
    <p
      v-if="voiceCapture.error.value"
      class="voice-recorder__error"
      role="alert"
    >
      {{ voiceCapture.error.value }}
    </p>

    <!-- Unsupported Browser Message -->
    <p
      v-if="showUnsupportedMessage || !isSupported"
      class="voice-recorder__error"
      role="alert"
    >
      Voice recording is not supported in your browser.
      <template v-if="browserName === 'firefox' && !hasWebSpeech">
        Firefox requires cloud transcription.
      </template>
    </p>

    <!-- Privacy Disclosure Modal -->
    <VoicePrivacyDisclosure
      :visible="showPrivacyDisclosure"
      @accept="handlePrivacyAccept"
      @decline="handlePrivacyDecline"
      @dont-show-again="handleDontShowAgain"
    />
  </div>
</template>

<style scoped>
.voice-recorder {
  @apply flex flex-col items-center gap-3;
}

.voice-recorder--compact {
  @apply gap-1;
}

.voice-recorder__button {
  @apply relative w-14 h-14 rounded-full bg-emerald-500 text-white
         flex items-center justify-center
         transition-all duration-200 ease-out
         hover:bg-emerald-600 hover:scale-105
         focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100;
}

.voice-recorder--compact .voice-recorder__button {
  @apply w-10 h-10;
}

.voice-recorder__button--recording {
  @apply bg-red-500 hover:bg-red-600;
}

.voice-recorder__button--error {
  @apply bg-red-500;
}

.voice-recorder__icon {
  @apply w-6 h-6;
}

.voice-recorder--compact .voice-recorder__icon {
  @apply w-5 h-5;
}

.voice-recorder__icon--stop {
  @apply w-5 h-5;
}

.voice-recorder__pulse {
  @apply absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75;
}

.voice-recorder__info {
  @apply flex items-center gap-3 text-sm text-gray-600;
}

.voice-recorder__levels {
  @apply flex items-end gap-0.5 h-4;
}

.voice-recorder__level-bar {
  @apply w-1 bg-gray-300 rounded-full transition-all duration-75;
  height: 4px;
}

.voice-recorder__level-bar--active {
  @apply bg-emerald-500;
}

.voice-recorder__level-bar:nth-child(1) {
  height: 6px;
}
.voice-recorder__level-bar:nth-child(2) {
  height: 10px;
}
.voice-recorder__level-bar:nth-child(3) {
  height: 14px;
}
.voice-recorder__level-bar:nth-child(4) {
  height: 10px;
}
.voice-recorder__level-bar:nth-child(5) {
  height: 6px;
}

.voice-recorder__level-bar--active:nth-child(1) {
  height: 8px;
}
.voice-recorder__level-bar--active:nth-child(2) {
  height: 12px;
}
.voice-recorder__level-bar--active:nth-child(3) {
  height: 16px;
}
.voice-recorder__level-bar--active:nth-child(4) {
  height: 12px;
}
.voice-recorder__level-bar--active:nth-child(5) {
  height: 8px;
}

.voice-recorder__duration {
  @apply font-mono text-gray-700;
}

.voice-recorder__cancel {
  @apply p-1 text-gray-400 hover:text-red-500 transition-colors;
}

.voice-recorder__mode {
  @apply text-center;
}

.voice-recorder__error {
  @apply text-sm text-red-600 text-center max-w-xs;
}
</style>
