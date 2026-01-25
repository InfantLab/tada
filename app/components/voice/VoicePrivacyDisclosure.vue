<script setup lang="ts">
/**
 * VoicePrivacyDisclosure Component
 * Shows privacy information before first voice recording
 * @component voice/VoicePrivacyDisclosure
 */

interface Props {
  /** Whether modal is visible */
  visible: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  /** User accepts and proceeds */
  accept: [];
  /** User declines */
  decline: [];
  /** Don't show again preference */
  dontShowAgain: [];
}>();

const dontShowAgain = ref(false);

function handleAccept() {
  if (dontShowAgain.value) {
    emit("dontShowAgain");
  }
  emit("accept");
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        @click.self="$emit('decline')"
      >
        <div
          class="bg-white dark:bg-stone-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
        >
          <!-- Header -->
          <div class="p-6 pb-4">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-3xl">🔐</span>
              <h2
                id="privacy-title"
                class="text-xl font-bold text-stone-800 dark:text-stone-100"
              >
                Voice Privacy Notice
              </h2>
            </div>

            <p class="text-sm text-stone-600 dark:text-stone-400 mb-4">
              Before you start recording, here's what you should know about how
              your voice data is handled:
            </p>
          </div>

          <!-- Content -->
          <div class="px-6 pb-4 space-y-4">
            <!-- Browser Speech Recognition -->
            <div
              class="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
            >
              <span class="text-xl">🌐</span>
              <div>
                <p
                  class="text-sm font-medium text-amber-800 dark:text-amber-200"
                >
                  Browser Speech Recognition
                </p>
                <p class="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  By default, your browser sends audio to Google (Chrome) or
                  Apple (Safari) for transcription. This is free but not fully
                  private.
                </p>
              </div>
            </div>

            <!-- On-Device Option -->
            <div
              class="flex gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
            >
              <span class="text-xl">📱</span>
              <div>
                <p
                  class="text-sm font-medium text-green-800 dark:text-green-200"
                >
                  On-Device Processing (Coming Soon)
                </p>
                <p class="text-xs text-green-700 dark:text-green-300 mt-1">
                  Download the Whisper model to process voice entirely on your
                  device. Nothing leaves your phone or computer.
                </p>
              </div>
            </div>

            <!-- Cloud with Your Keys -->
            <div
              class="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
            >
              <span class="text-xl">🔑</span>
              <div>
                <p class="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Bring Your Own API Keys
                </p>
                <p class="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Add your own API keys for OpenAI, Anthropic, or Groq in
                  Settings. Audio is processed under your account and never
                  stored.
                </p>
              </div>
            </div>

            <!-- Data Handling -->
            <div
              class="flex gap-3 p-3 bg-stone-100 dark:bg-stone-700/50 rounded-lg"
            >
              <span class="text-xl">🗑️</span>
              <div>
                <p
                  class="text-sm font-medium text-stone-800 dark:text-stone-200"
                >
                  No Audio Storage
                </p>
                <p class="text-xs text-stone-600 dark:text-stone-400 mt-1">
                  Ta-Da never saves your audio recordings. Once transcribed, the
                  audio is immediately deleted.
                </p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="p-6 pt-4 border-t border-stone-200 dark:border-stone-700 space-y-4"
          >
            <!-- Don't show again -->
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="dontShowAgain"
                type="checkbox"
                class="w-4 h-4 rounded border-stone-300 text-indigo-500 focus:ring-indigo-500"
              />
              <span class="text-sm text-stone-600 dark:text-stone-400">
                Don't show this again
              </span>
            </label>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-lg bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                @click="$emit('decline')"
              >
                Cancel
              </button>
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
                @click="handleAccept"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  @apply transition-all duration-200 ease-out;
}

.modal-enter-from,
.modal-leave-to {
  @apply opacity-0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  @apply scale-95 opacity-0;
}
</style>
