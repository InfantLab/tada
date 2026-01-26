<template>
  <Teleport to="body">
    <div
      class="fixed top-4 right-4 z-50 space-y-3 max-w-md"
      aria-live="polite"
      aria-atomic="false"
    >
      <TransitionGroup name="toast" tag="div" class="space-y-3">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'flex items-start gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm',
            'border transition-all duration-300',
            toastStyles[toast.type],
          ]"
          role="alert"
        >
          <!-- Icon -->
          <div class="flex-shrink-0 text-xl">
            {{ toastIcons[toast.type] }}
          </div>

          <!-- Message and action -->
          <div class="flex-1">
            <div class="text-sm font-medium">
              {{ toast.message }}
            </div>
            <!-- Copy and Action buttons -->
            <div class="flex gap-2 mt-2">
              <button
                v-if="toast.type === 'error'"
                class="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-800/50 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                @click="copyError(toast)"
              >
                {{ copiedId === toast.id ? "✓ Copied" : "📋 Copy" }}
              </button>
              <button
                v-if="toast.action"
                class="text-sm font-semibold underline hover:no-underline transition-all"
                @click="handleAction(toast)"
              >
                {{ toast.action.label }}
              </button>
            </div>
          </div>

          <!-- Dismiss button -->
          <button
            v-if="toast.dismissible"
            class="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss notification"
            @click="dismissToast(toast.id)"
          >
            ✕
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Toast } from "~/composables/useToast";

const { toasts, dismissToast } = useToast();

// Track which toast was copied
const copiedId = ref<string | null>(null);

const handleAction = async (toast: Toast) => {
  if (toast.action) {
    await toast.action.onClick();
    dismissToast(toast.id);
  }
};

const copyError = async (toast: Toast) => {
  try {
    const lines = [
      `Error: ${toast.message}`,
      `Time: ${new Date().toISOString()}`,
    ];
    if (toast.details) {
      lines.push(`Details: ${toast.details}`);
    }
    lines.push(`URL: ${window.location.href}`);
    lines.push(`User-Agent: ${navigator.userAgent}`);

    await navigator.clipboard.writeText(lines.join("\n"));
    copiedId.value = toast.id;
    // Reset after 2 seconds
    setTimeout(() => {
      copiedId.value = null;
    }, 2000);
  } catch {
    console.error("Failed to copy error to clipboard");
  }
};

const toastStyles = {
  success:
    "bg-green-50/95 dark:bg-green-900/90 border-green-200 dark:border-green-800 text-green-800 dark:text-green-100",
  error:
    "bg-red-50/95 dark:bg-red-900/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-100",
  warning:
    "bg-yellow-50/95 dark:bg-yellow-900/90 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-100",
  info: "bg-blue-50/95 dark:bg-blue-900/90 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-100",
};

const toastIcons = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(2rem);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(2rem) scale(0.95);
}
</style>
