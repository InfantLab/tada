<script setup lang="ts">
// Timer page - meditation and timed activity timer

definePageMeta({
  layout: "default",
});

// Timer state
const timerMode = ref<"countdown" | "unlimited">("countdown");
const targetMinutes = ref(10);
const elapsedSeconds = ref(0);
const isRunning = ref(false);
const isPaused = ref(false);
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null);
const category = ref("sitting");
const isSaving = ref(false);

// Timer presets
const presets = [5, 10, 15, 20, 30, 45, 60];

// Activity categories
const categories = [
  { value: "sitting", label: "Sitting", icon: "🧘" },
  { value: "breathing", label: "Breathing", icon: "🫁" },
  { value: "walking", label: "Walking", icon: "🚶" },
  { value: "tai_chi", label: "Tai Chi", icon: "🥋" },
  { value: "music", label: "Music", icon: "🎵" },
  { value: "lesson", label: "Lesson", icon: "📚" },
  { value: "other", label: "Other", icon: "⏱️" },
];

// Computed display values
const displayTime = computed(() => {
  if (timerMode.value === "countdown") {
    const remaining = Math.max(
      0,
      targetMinutes.value * 60 - elapsedSeconds.value
    );
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  } else {
    const mins = Math.floor(elapsedSeconds.value / 60);
    const secs = elapsedSeconds.value % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
});

const progress = computed(() => {
  if (timerMode.value === "countdown") {
    return (elapsedSeconds.value / (targetMinutes.value * 60)) * 100;
  }
  return 0;
});

const isComplete = computed(() => {
  return (
    timerMode.value === "countdown" &&
    elapsedSeconds.value >= targetMinutes.value * 60
  );
});

// Timer controls
function startTimer() {
  isRunning.value = true;
  isPaused.value = false;
  timerInterval.value = setInterval(() => {
    elapsedSeconds.value++;

    // Check for completion in countdown mode
    if (
      timerMode.value === "countdown" &&
      elapsedSeconds.value >= targetMinutes.value * 60
    ) {
      stopTimer();
      playBell();
    }
  }, 1000);
}

function pauseTimer() {
  isPaused.value = true;
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
}

function resumeTimer() {
  isPaused.value = false;
  timerInterval.value = setInterval(() => {
    elapsedSeconds.value++;

    if (
      timerMode.value === "countdown" &&
      elapsedSeconds.value >= targetMinutes.value * 60
    ) {
      stopTimer();
      playBell();
    }
  }, 1000);
}

function stopTimer() {
  isRunning.value = false;
  isPaused.value = false;
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
}

function resetTimer() {
  stopTimer();
  elapsedSeconds.value = 0;
}

function playBell() {
  // TODO: Implement actual audio playback when bell sounds are added
  // For now, use browser notification sound or console
  console.log("🔔 Bell!");

  // Try to play a system notification sound if available
  if ("Audio" in window) {
    try {
      const audio = new Audio("/sounds/bell.mp3");
      audio.play().catch(() => {
        // Fallback to console if audio fails
        console.log("Bell sound failed to play");
      });
    } catch {
      console.log("Audio not available");
    }
  }
}

async function saveSession() {
  if (elapsedSeconds.value < 1) return;

  isSaving.value = true;

  try {
    const entry = {
      type: "timed",
      name: `${
        categories.find((c) => c.value === category.value)?.label ||
        "Meditation"
      } (${Math.floor(elapsedSeconds.value / 60)}m)`,
      timestamp: new Date().toISOString(),
      durationSeconds: elapsedSeconds.value,
      data: {
        mode: timerMode.value,
        category: category.value,
        targetMinutes:
          timerMode.value === "countdown" ? targetMinutes.value : null,
      },
      tags: ["meditation", category.value],
    };

    await $fetch("/api/entries", {
      method: "POST",
      body: entry,
    });

    // Reset for next session
    resetTimer();

    // Navigate to timeline
    navigateTo("/");
  } catch (error: unknown) {
    console.error("Failed to save session:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    alert(`Failed to save session: ${message}`);
  } finally {
    isSaving.value = false;
  }
}

// Cleanup on unmount
onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
});

// Keep screen awake while timer is running
// TODO: Implement wake lock API
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[70vh]">
    <!-- Category selector (only when not running) -->
    <div v-if="!isRunning" class="mb-6">
      <label
        class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2 text-center"
      >
        Activity Type
      </label>
      <div class="flex flex-wrap gap-2 justify-center max-w-md">
        <button
          v-for="cat in categories"
          :key="cat.value"
          class="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          :class="
            category === cat.value
              ? 'bg-tada-100 dark:bg-tada-900/50 text-tada-700 dark:text-tada-300 ring-2 ring-tada-500'
              : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
          "
          @click="category = cat.value"
        >
          <span>{{ cat.icon }}</span>
          <span>{{ cat.label }}</span>
        </button>
      </div>
    </div>

    <!-- Mode toggle (only when not running) -->
    <div v-if="!isRunning" class="flex gap-2 mb-8">
      <button
        class="px-4 py-2 rounded-lg font-medium transition-colors"
        :class="
          timerMode === 'countdown'
            ? 'bg-tada-600 text-white'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
        "
        @click="timerMode = 'countdown'"
      >
        Countdown
      </button>
      <button
        class="px-4 py-2 rounded-lg font-medium transition-colors"
        :class="
          timerMode === 'unlimited'
            ? 'bg-tada-600 text-white'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
        "
        @click="timerMode = 'unlimited'"
      >
        Unlimited
      </button>
    </div>

    <!-- Duration presets (only for countdown, when not running) -->
    <div
      v-if="timerMode === 'countdown' && !isRunning"
      class="flex flex-wrap gap-2 justify-center mb-8"
    >
      <button
        v-for="preset in presets"
        :key="preset"
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="
          targetMinutes === preset
            ? 'bg-tada-100 dark:bg-tada-900/50 text-tada-700 dark:text-tada-300'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
        "
        @click="targetMinutes = preset"
      >
        {{ preset }}m
      </button>
    </div>

    <!-- Timer display -->
    <div class="relative mb-8">
      <!-- Progress ring (countdown mode only) -->
      <svg
        v-if="timerMode === 'countdown'"
        class="w-64 h-64 transform -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          class="text-stone-200 dark:text-stone-700"
          stroke="currentColor"
          stroke-width="4"
          fill="none"
          r="45"
          cx="50"
          cy="50"
        />
        <circle
          class="text-tada-500 transition-all duration-1000"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          fill="none"
          r="45"
          cx="50"
          cy="50"
          :stroke-dasharray="283"
          :stroke-dashoffset="283 - (progress / 100) * 283"
        />
      </svg>

      <!-- Time display -->
      <div
        class="absolute inset-0 flex flex-col items-center justify-center"
        :class="timerMode === 'unlimited' ? 'static' : ''"
      >
        <span
          class="font-mono font-light tracking-tight"
          :class="
            timerMode === 'countdown'
              ? 'text-5xl'
              : 'text-7xl text-stone-800 dark:text-stone-100'
          "
        >
          {{ displayTime }}
        </span>
        <span
          v-if="timerMode === 'unlimited'"
          class="text-sm text-stone-500 dark:text-stone-400 mt-2"
        >
          elapsed
        </span>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex gap-4">
      <!-- Not running state -->
      <template v-if="!isRunning">
        <button
          class="w-20 h-20 rounded-full bg-tada-600 hover:bg-tada-700 text-white flex items-center justify-center shadow-lg transition-colors"
          @click="startTimer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-10 w-10"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </template>

      <!-- Running state -->
      <template v-else>
        <!-- Pause/Resume -->
        <button
          class="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 flex items-center justify-center shadow transition-colors"
          @click="isPaused ? resumeTimer() : pauseTimer()"
        >
          <svg
            v-if="!isPaused"
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        <!-- Stop / Save -->
        <button
          :disabled="isSaving"
          class="w-20 h-20 rounded-full bg-tada-600 hover:bg-tada-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-lg transition-colors"
          @click="saveSession"
        >
          <svg
            v-if="!isSaving"
            xmlns="http://www.w3.org/2000/svg"
            class="h-10 w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <div
            v-else
            class="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"
          />
        </button>

        <!-- Reset -->
        <button
          class="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 flex items-center justify-center shadow transition-colors"
          @click="resetTimer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </template>
    </div>

    <!-- Session complete message -->
    <div v-if="isComplete" class="mt-8 text-center">
      <p class="text-lg text-tada-600 dark:text-tada-400 font-medium">
        🎉 Session complete!
      </p>
      <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
        Tap the checkmark to save your session
      </p>
    </div>
  </div>
</template>
