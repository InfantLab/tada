<script setup lang="ts">
/**
 * VoiceErrorBoundary Component
 * Catches and displays voice feature errors with recovery options
 * @component voice/VoiceErrorBoundary
 */

interface Props {
  /** Error message to display */
  error?: string | null;
  /** Error type for appropriate messaging */
  errorType?: "permission" | "network" | "transcription" | "processing" | "unknown";
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  errorType: "unknown",
});

const emit = defineEmits<{
  /** User wants to retry */
  retry: [];
  /** User dismissed the error */
  dismiss: [];
}>();

// User-friendly error messages based on error type
const errorMessages = computed(() => {
  switch (props.errorType) {
    case "permission":
      return {
        title: "Microphone Access Needed",
        message:
          "Please allow microphone access in your browser settings to use voice features.",
        action: "Try Again",
        canRetry: true,
      };
    case "network":
      return {
        title: "Connection Issue",
        message:
          "Unable to connect to the transcription service. Your recording has been saved and will be processed when you're back online.",
        action: "Retry Now",
        canRetry: true,
      };
    case "transcription":
      return {
        title: "Transcription Failed",
        message:
          "We couldn't understand the audio. Try speaking more clearly or check your microphone.",
        action: "Try Again",
        canRetry: true,
      };
    case "processing":
      return {
        title: "Processing Error",
        message:
          "Something went wrong while processing your recording. Please try again.",
        action: "Retry",
        canRetry: true,
      };
    default:
      return {
        title: "Something Went Wrong",
        message: props.error || "An unexpected error occurred. Please try again.",
        action: "Try Again",
        canRetry: true,
      };
  }
});

function handleRetry() {
  emit("retry");
}

function handleDismiss() {
  emit("dismiss");
}
</script>

<template>
  <div
    v-if="error"
    class="voice-error-boundary"
    role="alert"
    aria-live="assertive"
  >
    <div class="voice-error-boundary__content">
      <!-- Error Icon -->
      <div class="voice-error-boundary__icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-6 h-6 text-red-500"
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

      <!-- Error Details -->
      <div class="voice-error-boundary__details">
        <h3 class="voice-error-boundary__title">
          {{ errorMessages.title }}
        </h3>
        <p class="voice-error-boundary__message">
          {{ errorMessages.message }}
        </p>
      </div>

      <!-- Actions -->
      <div class="voice-error-boundary__actions">
        <button
          v-if="errorMessages.canRetry"
          type="button"
          class="voice-error-boundary__retry"
          @click="handleRetry"
        >
          {{ errorMessages.action }}
        </button>
        <button
          type="button"
          class="voice-error-boundary__dismiss"
          aria-label="Dismiss error"
          @click="handleDismiss"
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
    </div>
  </div>
</template>

<style scoped>
.voice-error-boundary {
  @apply fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md;
}

.voice-error-boundary__content {
  @apply flex items-start gap-3 p-4 bg-white border border-red-200 rounded-lg shadow-lg;
}

.voice-error-boundary__icon {
  @apply flex-shrink-0;
}

.voice-error-boundary__details {
  @apply flex-1 min-w-0;
}

.voice-error-boundary__title {
  @apply text-sm font-semibold text-gray-900;
}

.voice-error-boundary__message {
  @apply mt-1 text-sm text-gray-600;
}

.voice-error-boundary__actions {
  @apply flex items-center gap-2 ml-2;
}

.voice-error-boundary__retry {
  @apply px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors;
}

.voice-error-boundary__dismiss {
  @apply p-1 text-gray-400 hover:text-gray-600 transition-colors;
}
</style>
