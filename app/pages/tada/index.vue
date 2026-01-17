<script setup lang="ts">
// Dedicated Ta-Da! entry page - celebrate accomplishments with positive reinforcement
import { getSubcategoriesForCategory } from "~/utils/categoryDefaults";

// Use the unified entry save composable
const { createEntry, isLoading: isSubmitting } = useEntrySave();
const { success: showSuccess } = useToast();

// User preferences for custom emojis (for emoji resolution in composable)
const { loadPreferences } = usePreferences();

// Load preferences on mount
onMounted(() => {
  loadPreferences();
});

// Auto-grow textarea as user types
function autoGrow() {
  const textarea = notesTextarea.value;
  if (textarea) {
    textarea.style.height = "auto";
    textarea.style.height =
      Math.min(textarea.scrollHeight, window.innerHeight * 0.5) + "px";
  }
}

definePageMeta({
  layout: "default",
});

// Form state
const title = ref("");
const notes = ref("");
const notesTextarea = ref<HTMLTextAreaElement | null>(null);

// Celebration state
const showCelebration = ref(false);

// Emoji picker state - default to ⚡
const customEmoji = ref<string>("⚡");
const showEmojiPicker = ref(false);

// Subcategory for tadas (home, work, personal, etc.)
const tadaSubcategory = ref("personal");

// Get subcategory options for tadas
const tadaSubcategoryOptions = computed(() => {
  return getSubcategoriesForCategory("accomplishment").map((s) => ({
    value: s.slug,
    label: s.label,
    emoji: s.emoji,
  }));
});

// Function to open emoji picker
function openEmojiPicker() {
  showEmojiPicker.value = true;
}

// Function to handle emoji selection
function handleEmojiSelect(emoji: string) {
  customEmoji.value = emoji;
}

// Play celebration sound - using the correct tada fanfare
function playCelebrationSound() {
  try {
    const audio = new Audio("/sounds/tada-f-versionD.mp3");
    audio.volume = 0.7;
    audio.play().catch(() => {
      // Audio play failed (user hasn't interacted with page yet)
    });
  } catch {
    // Audio not supported
  }
}

// Trigger celebration animation and sound
function celebrate() {
  showCelebration.value = true;
  playCelebrationSound();
  showSuccess("Ta-Da! 🎉 Great job!");

  // Auto-hide celebration after animation completes
  setTimeout(() => {
    showCelebration.value = false;
    navigateTo("/");
  }, 2000);
}

async function submitEntry() {
  if (!title.value.trim() && !notes.value.trim()) return;

  const result = await createEntry(
    {
      type: "tada",
      name: title.value.trim() || "Ta-Da! entry",
      category: "accomplishment",
      subcategory: tadaSubcategory.value,
      emoji: customEmoji.value || "⚡",
      notes: notes.value.trim() || null,
      data: {},
      tags: ["accomplishment", tadaSubcategory.value].filter(
        Boolean
      ) as string[],
    },
    {
      skipEmojiResolution: true, // Use the emoji we have
      showSuccessToast: false, // We handle celebration ourselves
    }
  );

  // Only celebrate if save succeeded
  if (result) {
    celebrate();
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Page header with Ta-Da! branding -->
    <div class="flex items-center gap-4 mb-6">
      <NuxtLink
        to="/"
        class="p-2 -ml-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </NuxtLink>
      <img src="/icons/tada-logotype.png" alt="TA-DA" class="h-12 w-auto" />
    </div>

    <!-- Main Ta-Da Entry Area -->
    <form
      class="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/30 dark:via-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-6 border-2 border-amber-200 dark:border-amber-700 shadow-lg space-y-6"
      @submit.prevent="submitEntry"
    >
      <!-- Large Emoji + Title Input - The Hero Section -->
      <div>
        <!-- Clickable Emoji -->
        <div class="flex justify-center mb-4">
          <button
            type="button"
            class="text-7xl hover:scale-110 transition-transform cursor-pointer p-2 rounded-2xl hover:bg-amber-100/50 dark:hover:bg-amber-800/30"
            title="Click to change emoji"
            @click="openEmojiPicker"
          >
            {{ customEmoji }}
          </button>
        </div>

        <!-- Large Title Input -->
        <input
          id="title"
          v-model="title"
          type="text"
          placeholder="What did you accomplish?"
          class="w-full px-4 py-4 text-2xl font-bold text-center rounded-xl border-2 border-amber-300 dark:border-amber-600 bg-white/80 dark:bg-stone-800/80 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-4 focus:ring-amber-400/50 dark:focus:ring-amber-500/50 focus:border-amber-400 dark:focus:border-amber-500"
          autofocus
        />

        <p class="text-center text-sm text-amber-600 dark:text-amber-400 mt-3">
          Tap the emoji to customize it ☝️
        </p>
      </div>

      <!-- Subcategory for Tadas -->
      <div>
        <label
          class="block text-sm font-medium text-amber-700 dark:text-amber-300 mb-2"
        >
          Category
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="subcat in tadaSubcategoryOptions"
            :key="subcat.value"
            type="button"
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
            :class="
              tadaSubcategory === subcat.value
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
            "
            @click="tadaSubcategory = subcat.value"
          >
            <span>{{ subcat.emoji }}</span>
            <span>{{ subcat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label
          for="notes"
          class="block text-sm font-medium text-amber-700 dark:text-amber-300 mb-2"
        >
          Details (optional)
        </label>
        <textarea
          id="notes"
          ref="notesTextarea"
          v-model="notes"
          rows="4"
          placeholder="Add any details you want to remember..."
          class="journal-textarea w-full px-5 py-4 rounded-xl border border-amber-200 dark:border-amber-700 bg-white/80 dark:bg-stone-800/80 text-stone-800 dark:text-stone-100 placeholder-amber-400/60 dark:placeholder-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-300 dark:focus:border-amber-600 focus:bg-white dark:focus:bg-stone-800 transition-all duration-200"
          @input="autoGrow"
        />
      </div>

      <!-- Submit button with celebration styling -->
      <button
        type="submit"
        :disabled="isSubmitting || (!title.trim() && !notes.trim())"
        class="w-full py-4 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-stone-300 disabled:to-stone-300 dark:disabled:from-stone-600 dark:disabled:to-stone-600 text-white font-bold text-xl rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg disabled:shadow-none flex items-center justify-center gap-3"
      >
        <span v-if="isSubmitting">Saving...</span>
        <template v-else>
          <span class="text-3xl">⚡</span>
          <span>Ta-Da!</span>
        </template>
      </button>
    </form>

    <!-- Link to history (outside the form card) -->
    <div class="text-center mt-4">
      <NuxtLink
        to="/tada/history"
        class="text-sm text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 underline"
      >
        View all your accomplishments →
      </NuxtLink>
    </div>

    <!-- Emoji Picker Component -->
    <EmojiPicker
      v-model="showEmojiPicker"
      entry-name="this Ta-Da!"
      @select="handleEmojiSelect"
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
/* Pretty textarea styling */
.journal-textarea {
  font-family: "Georgia", "Times New Roman", serif;
  font-size: 1.125rem;
  line-height: 1.75;
  letter-spacing: 0.01em;
  resize: none;
  min-height: 6rem;
  max-height: 50vh;
  overflow-y: auto;
  field-sizing: content;
}

.journal-textarea::placeholder {
  font-style: italic;
  opacity: 0.6;
}

.journal-textarea:focus {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04);
}

.journal-textarea::-webkit-scrollbar {
  width: 6px;
}

.journal-textarea::-webkit-scrollbar-track {
  background: transparent;
}

.journal-textarea::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.3);
  border-radius: 3px;
}

.journal-textarea::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.5);
}

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
    transform: translateY(0) rotate(var(--rotation));
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(calc(var(--rotation) + 720deg));
    opacity: 0;
  }
}

/* Transition */
.celebration-enter-active {
  animation: celebration-in 0.3s ease-out;
}

.celebration-leave-active {
  animation: celebration-out 0.5s ease-in;
}

@keyframes celebration-in {
  from {
    opacity: 0;
    transform: scale(1.2);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes celebration-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
