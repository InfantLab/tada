<script setup lang="ts">
/**
 * Voice Input Page
 * Dedicated voice recording interface for quick capture
 */

import type { ExtractedTada } from "~/types/extraction";
import type { ProcessingMethod, STTProvider } from "~/types/voice";

definePageMeta({
  layout: "default",
});

const { success } = useToast();
const router = useRouter();

// Voice state
const voiceMode = ref<"journal" | "tada">("tada");
const voiceStatus = ref<"idle" | "recording" | "transcribing" | "processing">(
  "idle",
);
const currentTranscription = ref<{
  text: string;
  confidence: number;
  processingMethod: ProcessingMethod;
  duration: number;
  provider: STTProvider;
} | null>(null);
const recordingDuration = ref(0);
const showVoiceReviewModal = ref(false);
const showTadaChecklist = ref(false);
const extractedTadas = ref<ExtractedTada[]>([]);
const isSubmitting = ref(false);
const showCelebration = ref(false);

// Composables
// TODO: Migrate to useEntryEngine once createVoiceEntry/createBatchTadas are implemented
const entrySave = useEntrySave();
const transcription = useTranscription();
const llmStructure = useLLMStructure();

// Get the user's preferred ta-da sound
function getTadaSoundFile(): string {
  try {
    const saved = localStorage.getItem("tada-settings");
    if (saved) {
      const settings = JSON.parse(saved);
      const soundMap: Record<string, string> = {
        "tada-short": "/sounds/tada-f-versionD.mp3",
        "tada-long": "/sounds/tada-f-versionA.mp3",
        twinkle: "/sounds/twinkle.mp3",
      };
      return soundMap[settings.tadaSound] || "/sounds/tada-f-versionD.mp3";
    }
  } catch {
    // Ignore errors
  }
  return "/sounds/tada-f-versionD.mp3";
}

// Play celebration sound
function playCelebrationSound() {
  try {
    const audio = new Audio(getTadaSoundFile());
    audio.volume = 0.7;
    audio.play().catch(() => {
      // Audio play failed
    });
  } catch {
    // Audio not supported
  }
}

// Trigger celebration animation and sound
function celebrate() {
  showCelebration.value = true;
  playCelebrationSound();

  // Auto-hide celebration after animation completes
  setTimeout(() => {
    showCelebration.value = false;
    router.push("/");
  }, 2000);
}

// Handle live transcription updates
function handleVoiceLiveTranscription(text: string): void {
  currentTranscription.value = {
    text,
    confidence: 0.8,
    processingMethod: "web-speech",
    duration: 0,
    provider: "web-speech",
  };
}

// Handle voice recording completion
async function handleVoiceComplete(
  _blob: Blob,
  duration: number,
): Promise<void> {
  recordingDuration.value = duration;
  voiceStatus.value = "processing";

  // Get the transcription text
  const transcriptionText = currentTranscription.value?.text || "";

  if (!transcriptionText.trim()) {
    voiceStatus.value = "idle";
    return;
  }

  if (voiceMode.value === "journal") {
    // For journal mode, show review modal
    showVoiceReviewModal.value = true;
    voiceStatus.value = "idle";
  } else {
    // For tada mode, extract tadas
    voiceStatus.value = "processing";
    try {
      const result = await llmStructure.extractTadas(transcriptionText);

      if (result.tadas && result.tadas.length > 0) {
        extractedTadas.value = result.tadas;
        showTadaChecklist.value = true;
      } else {
        // No tadas found - offer journal fallback
        showVoiceReviewModal.value = true;
      }
    } catch {
      // Fallback to journal mode on error
      showVoiceReviewModal.value = true;
    }
    voiceStatus.value = "idle";
  }
}

// Handle voice cancel
function handleVoiceCancel(): void {
  voiceStatus.value = "idle";
  currentTranscription.value = null;
}

// Handle voice error
function handleVoiceError(error: string): void {
  voiceStatus.value = "idle";
  console.error("Voice error:", error);
}

// Handle transcription confirm (journal mode)
// Handle transcription confirmation from VoiceReviewModal
async function handleTranscriptionConfirm(
  text: string,
  subtype?: string,
): Promise<void> {
  isSubmitting.value = true;
  try {
    await entrySave.createVoiceEntry(
      text,
      {
        transcription: currentTranscription.value?.text || "",
        recordingDurationMs: recordingDuration.value,
        sttProvider: "web-speech",
        confidence: currentTranscription.value?.confidence || 0.8,
        llmProvider: undefined,
      },
      {
        subcategory: subtype,
      },
    );
    success("Journal entry saved!");
    showVoiceReviewModal.value = false;
    currentTranscription.value = null;
    router.push("/");
  } finally {
    isSubmitting.value = false;
  }
}

// Handle transcription cancel
function handleTranscriptionCancel(): void {
  showVoiceReviewModal.value = false;
  currentTranscription.value = null;
}

// Handle re-record
function handleReRecord(): void {
  showVoiceReviewModal.value = false;
  showTadaChecklist.value = false;
  currentTranscription.value = null;
  extractedTadas.value = [];
}

// Handle tada save
async function handleTadaSave(selectedTadas: ExtractedTada[]): Promise<void> {
  isSubmitting.value = true;
  try {
    const extractionId = `voice-${Date.now()}`;
    await entrySave.createBatchTadas(
      selectedTadas.map((t) => ({
        title: t.title,
        category: t.category,
        subcategory: t.subcategory,
        significance: t.significance || "normal",
        confidence: t.confidence || 0.8,
      })),
      extractionId,
    );
    showTadaChecklist.value = false;
    extractedTadas.value = [];
    currentTranscription.value = null;
    // Trigger celebration instead of just navigating
    celebrate();
  } finally {
    isSubmitting.value = false;
  }
}

// Handle save as journal from tada review
async function handleTadaSaveAsJournal(): Promise<void> {
  showTadaChecklist.value = false;
  showVoiceReviewModal.value = true;
}

// Handle tada cancel
function handleTadaCancel(): void {
  showTadaChecklist.value = false;
  extractedTadas.value = [];
  currentTranscription.value = null;
}

// Handle tada update
function handleTadaUpdate(updatedTadas: ExtractedTada[]): void {
  extractedTadas.value = updatedTadas;
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="text-5xl mb-4">🎤</div>
      <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
        Voice Input
      </h1>
      <p class="text-stone-500 dark:text-stone-400 mt-2">
        Speak your accomplishments or thoughts
      </p>
    </div>

    <!-- Mode Toggle -->
    <div class="flex justify-center mb-8">
      <div class="inline-flex bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
        <button
          type="button"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="
            voiceMode === 'tada'
              ? 'bg-white dark:bg-stone-600 text-indigo-600 dark:text-indigo-300 shadow-sm'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
          "
          @click="voiceMode = 'tada'"
        >
          ⚡ Ta-Das
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="
            voiceMode === 'journal'
              ? 'bg-white dark:bg-stone-600 text-indigo-600 dark:text-indigo-300 shadow-sm'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
          "
          @click="voiceMode = 'journal'"
        >
          📝 Journal
        </button>
      </div>
    </div>

    <!-- Mode Description -->
    <p class="text-center text-sm text-stone-500 dark:text-stone-400 mb-8">
      {{
        voiceMode === "tada"
          ? 'Say what you accomplished: "I fixed the sink, called mom, and finished the book"'
          : "Record a journal entry, dream, or reflection"
      }}
    </p>

    <!-- Voice Recorder -->
    <div class="flex flex-col items-center">
      <VoiceRecorder
        :mode="voiceMode"
        size="large"
        @complete="handleVoiceComplete"
        @cancel="handleVoiceCancel"
        @error="handleVoiceError"
        @transcription="handleVoiceLiveTranscription"
      />

      <VoiceStatusIndicator
        v-if="voiceStatus !== 'idle'"
        :status="voiceStatus"
        :progress="transcription.progress.value"
        class="mt-4"
      />

      <!-- Live transcription preview -->
      <div v-if="currentTranscription?.text" class="mt-6 max-w-md w-full">
        <p class="text-sm text-stone-500 dark:text-stone-400 mb-2">
          Live transcription:
        </p>
        <div
          class="p-4 bg-stone-50 dark:bg-stone-800 rounded-lg text-stone-700 dark:text-stone-300"
        >
          {{ currentTranscription.text }}
        </div>
      </div>
    </div>

    <!-- Voice Review Modal -->
    <VoiceReviewModal
      :visible="showVoiceReviewModal"
      :transcription="currentTranscription"
      :duration="recordingDuration"
      mode="journal"
      :loading="isSubmitting"
      @confirm="handleTranscriptionConfirm"
      @cancel="handleTranscriptionCancel"
      @re-record="handleReRecord"
    />

    <!-- Tada Checklist Review -->
    <VoiceTadaChecklistReview
      v-if="showTadaChecklist"
      :tadas="extractedTadas"
      :transcription="currentTranscription?.text || ''"
      :loading="isSubmitting"
      @save="handleTadaSave"
      @save-as-journal="handleTadaSaveAsJournal"
      @cancel="handleTadaCancel"
      @re-record="handleReRecord"
      @update="handleTadaUpdate"
    />

    <!-- Celebration Overlay -->
    <Teleport to="body">
      <Transition name="celebration">
        <div
          v-if="showCelebration"
          class="celebration-overlay"
          aria-live="polite"
        >
          <div class="celebration-content">
            <span class="celebration-emoji">🎉</span>
            <span class="celebration-text">TA-DA!</span>
            <div class="confetti-container">
              <span
                v-for="i in 30"
                :key="i"
                class="confetti"
                :style="{
                  '--delay': `${Math.random() * 0.5}s`,
                  '--x': `${Math.random() * 100}%`,
                  '--rotation': `${Math.random() * 360}deg`,
                }"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Celebration Overlay */
.celebration-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    rgba(251, 191, 36, 0.95) 0%,
    rgba(245, 158, 11, 0.95) 100%
  );
  pointer-events: none;
}

.celebration-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  animation: celebrate-bounce 0.6s ease-out;
}

.celebration-emoji {
  font-size: 6rem;
  animation: celebrate-pulse 0.3s ease-out infinite alternate;
}

.celebration-text {
  font-size: 4rem;
  font-weight: 900;
  color: white;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  letter-spacing: 0.15em;
}

/* Confetti Animation */
.confetti-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.confetti {
  position: absolute;
  top: -20px;
  left: var(--x);
  width: 12px;
  height: 12px;
  background: linear-gradient(
    45deg,
    #fbbf24,
    #f59e0b,
    #ef4444,
    #8b5cf6,
    #10b981,
    #3b82f6
  );
  border-radius: 2px;
  animation: confetti-fall 2s ease-out forwards;
  animation-delay: var(--delay);
  transform: rotate(var(--rotation));
}

.confetti:nth-child(odd) {
  background: #fbbf24;
}

.confetti:nth-child(3n) {
  background: #ef4444;
}

.confetti:nth-child(5n) {
  background: #10b981;
}

.confetti:nth-child(7n) {
  background: #3b82f6;
}

/* Animations */
@keyframes celebrate-bounce {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes celebrate-pulse {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.1);
  }
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

/* Transition classes */
.celebration-enter-active {
  transition: opacity 0.3s ease-out;
}

.celebration-leave-active {
  transition: opacity 0.5s ease-in;
}

.celebration-enter-from,
.celebration-leave-to {
  opacity: 0;
}
</style>
