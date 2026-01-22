<script setup lang="ts">
/**
 * Custom error page with better UX
 * Shows clear error messages with copy and dismiss functionality
 */

const props = defineProps<{
  error: {
    statusCode: number;
    message: string;
    stack?: string;
  };
}>();

const showDetails = ref(false);
const copied = ref(false);

const isDevMode = import.meta.dev;

const errorDetails = computed(() => {
  return JSON.stringify(
    {
      statusCode: props.error.statusCode,
      message: props.error.message,
      stack: props.error.stack,
      url: typeof window !== "undefined" ? window.location.href : "",
      timestamp: new Date().toISOString(),
    },
    null,
    2,
  );
});

async function copyError() {
  try {
    await navigator.clipboard.writeText(errorDetails.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = errorDetails.value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  }
}

function clearError() {
  clearError();
  navigateTo("/");
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigateTo("/");
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-pearl-white dark:bg-cosmic-black flex items-center justify-center p-4"
  >
    <div
      class="max-w-lg w-full bg-white dark:bg-cosmic-indigo rounded-xl shadow-lg p-8"
    >
      <!-- Error Icon -->
      <div class="text-center mb-6">
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-4xl mb-4"
        >
          ⚠️
        </div>
        <h1 class="text-2xl font-bold text-text-light dark:text-text-dark">
          {{
            error.statusCode === 404 ? "Page Not Found" : "Something Went Wrong"
          }}
        </h1>
      </div>

      <!-- Error Message -->
      <div
        class="bg-pearl-mist dark:bg-cosmic-indigo-light rounded-lg p-4 mb-6"
      >
        <p class="text-text-light dark:text-text-dark text-center">
          {{ error.message || "An unexpected error occurred" }}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-3">
        <button
          class="w-full py-3 px-4 bg-mindfulness-light dark:bg-mindfulness-dark text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
          @click="goBack"
        >
          ← Go Back
        </button>
        <button
          class="w-full py-3 px-4 border border-mindfulness-light dark:border-mindfulness-dark text-mindfulness-light dark:text-mindfulness-dark rounded-lg hover:bg-mindfulness-light/10 dark:hover:bg-mindfulness-dark/10 transition-colors font-medium"
          @click="clearError"
        >
          🏠 Go Home
        </button>
      </div>

      <!-- Developer Details (dev mode only) -->
      <div
        v-if="isDevMode"
        class="mt-6 pt-6 border-t border-pearl-mist dark:border-cosmic-indigo-light"
      >
        <button
          class="flex items-center justify-between w-full text-sm text-text-light-muted dark:text-text-dark-muted hover:text-text-light dark:hover:text-text-dark"
          @click="showDetails = !showDetails"
        >
          <span>🔧 Developer Details</span>
          <span>{{ showDetails ? "▼" : "▶" }}</span>
        </button>

        <div v-if="showDetails" class="mt-4">
          <div class="flex justify-end mb-2">
            <button
              class="text-xs px-3 py-1 rounded bg-pearl-mist dark:bg-cosmic-indigo-light text-text-light-muted dark:text-text-dark-muted hover:text-text-light dark:hover:text-text-dark"
              @click="copyError"
            >
              {{ copied ? "✓ Copied!" : "📋 Copy Error" }}
            </button>
          </div>
          <pre
            class="text-xs bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto"
            >{{ errorDetails }}</pre
          >
        </div>
      </div>

      <!-- Error Code Footer -->
      <p
        class="text-center text-xs text-text-light-muted dark:text-text-dark-muted mt-6"
      >
        Error {{ error.statusCode }}
      </p>
    </div>
  </div>
</template>
