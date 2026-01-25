<script setup lang="ts">
/**
 * VoiceStatusIndicator Component
 * Displays current voice processing status with visual feedback
 * @component voice/VoiceStatusIndicator
 */

import type { VoiceRecordingStatus } from "~/types/voice";

interface Props {
  /** Current status */
  status: VoiceRecordingStatus;
  /** Progress percentage (0-100) for transcription/processing */
  progress?: number;
  /** Custom message to display */
  message?: string;
  /** Processing mode: on-device or cloud */
  processingMode?: "on-device" | "cloud";
  /** Cloud provider name when using cloud processing */
  cloudProvider?: "groq" | "openai" | "anthropic" | "whisper";
  /** Show retry button for failed items */
  showRetry?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  message: "",
  processingMode: "on-device",
  cloudProvider: undefined,
  showRetry: false,
});

const emit = defineEmits<{
  /** Retry button clicked */
  retry: [];
}>();

// Build dynamic message based on processing mode and provider
const processingMessage = computed(() => {
  if (props.message) return props.message;

  if (props.processingMode === "on-device") {
    return "Processing on device...";
  }

  if (props.cloudProvider) {
    const providerNames: Record<string, string> = {
      groq: "Groq",
      openai: "OpenAI",
      anthropic: "Anthropic",
      whisper: "Whisper",
    };
    return `Sending to ${providerNames[props.cloudProvider] || props.cloudProvider}...`;
  }

  return "Sending to cloud...";
});

// Status display configuration
const statusConfig = computed(() => {
  switch (props.status) {
    case "idle":
      return {
        icon: "mic",
        label: props.message || "Ready to record",
        color: "text-gray-500",
        bgColor: "bg-gray-100",
        animate: false,
      };
    case "requesting-permission":
      return {
        icon: "shield",
        label: props.message || "Requesting microphone access...",
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        animate: true,
      };
    case "recording":
      return {
        icon: "mic-recording",
        label: props.message || "Recording...",
        color: "text-red-600",
        bgColor: "bg-red-50",
        animate: true,
      };
    case "processing":
      return {
        icon: "loader",
        label: processingMessage.value,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        animate: true,
      };
    case "transcribing":
      return {
        icon: "text",
        label: props.message || `${processingMessage.value} ${props.progress}%`,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        animate: true,
      };
    case "extracting":
      return {
        icon: "sparkles",
        label:
          props.message ||
          (props.processingMode === "on-device"
            ? "Extracting on device..."
            : `Extracting via ${props.cloudProvider || "cloud"}...`),
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
        animate: true,
      };
    case "offline":
      return {
        icon: "wifi-off",
        label: props.message || "Offline - will process later",
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        animate: false,
      };
    case "queued":
      return {
        icon: "clock",
        label: props.message || "Queued for processing",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        animate: false,
      };
    case "complete":
      return {
        icon: "check",
        label: props.message || "Complete!",
        color: "text-green-600",
        bgColor: "bg-green-50",
        animate: false,
      };
    case "error":
      return {
        icon: "alert",
        label: props.message || "Error occurred",
        color: "text-red-600",
        bgColor: "bg-red-50",
        animate: false,
      };
    default:
      return {
        icon: "mic",
        label: "Unknown status",
        color: "text-gray-500",
        bgColor: "bg-gray-100",
        animate: false,
      };
  }
});
</script>

<template>
  <div
    class="voice-status"
    :class="[statusConfig.bgColor]"
    role="status"
    :aria-live="statusConfig.animate ? 'polite' : 'off'"
  >
    <!-- Status Icon -->
    <div
      class="voice-status__icon"
      :class="[statusConfig.color, { 'animate-pulse': statusConfig.animate }]"
    >
      <!-- Microphone Icon -->
      <svg
        v-if="statusConfig.icon === 'mic'"
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
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>

      <!-- Recording Mic Icon -->
      <svg
        v-else-if="statusConfig.icon === 'mic-recording'"
        xmlns="http://www.w3.org/2000/svg"
        class="w-5 h-5 animate-pulse"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
        <path
          d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V20H8a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07A7 7 0 0019 11z"
        />
      </svg>

      <!-- Shield Icon (permission) -->
      <svg
        v-else-if="statusConfig.icon === 'shield'"
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
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>

      <!-- Loader Icon -->
      <svg
        v-else-if="statusConfig.icon === 'loader'"
        xmlns="http://www.w3.org/2000/svg"
        class="w-5 h-5 animate-spin"
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
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      <!-- Text Icon (transcription) -->
      <svg
        v-else-if="statusConfig.icon === 'text'"
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>

      <!-- Alert Icon -->
      <svg
        v-else-if="statusConfig.icon === 'alert'"
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
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>

    <!-- Status Label -->
    <span class="voice-status__label" :class="statusConfig.color">
      {{ statusConfig.label }}
    </span>

    <!-- Progress Bar (for transcription) -->
    <div
      v-if="status === 'transcribing' && progress > 0"
      class="voice-status__progress"
    >
      <div
        class="voice-status__progress-bar"
        :style="{ width: `${progress}%` }"
      />
    </div>

    <!-- Retry Button (for failed items) -->
    <button
      v-if="status === 'error' && showRetry"
      type="button"
      class="voice-status__retry"
      aria-label="Retry processing"
      @click="emit('retry')"
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
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span>Retry</span>
    </button>
  </div>
</template>

<style scoped>
.voice-status {
  @apply flex items-center gap-2 px-3 py-2 rounded-lg text-sm;
}

.voice-status__icon {
  @apply flex-shrink-0;
}

.voice-status__label {
  @apply font-medium;
}

.voice-status__progress {
  @apply flex-1 h-1.5 bg-purple-200 rounded-full overflow-hidden ml-2;
}

.voice-status__progress-bar {
  @apply h-full bg-purple-600 rounded-full transition-all duration-300 ease-out;
}

.voice-status__retry {
  @apply flex items-center gap-1 ml-auto px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors;
}
</style>
