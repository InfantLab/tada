<script setup lang="ts">
// Timer page - meditation and timed activity timer
import {
  CATEGORY_DEFAULTS,
  getSubcategoriesForCategory,
  getSubcategoryEmoji,
  getTimedCategories,
} from "~/utils/categoryDefaults";

definePageMeta({
  layout: "default",
});

// Timer state
const timerMode = ref<"countdown" | "unlimited">("countdown");
const targetMinutes = ref(1);
const elapsedSeconds = ref(0);
const isRunning = ref(false);
const isPaused = ref(false);
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null);

// Category hierarchy - parent category and subcategory
const selectedCategory = ref("mindfulness");
const selectedSubcategory = ref("sitting");

const isSaving = ref(false);
const customMinutes = ref<string>("");
const loopCount = ref(1);
const loopsCompleted = ref(0);
const startBell = ref("bell");
const endBell = ref("bell");
const showSettings = ref(false);
const wakeLock = ref<WakeLockSentinel | null>(null);

// Derive subcategory options from selected category
const subcategoryOptions = computed(() => {
  return getSubcategoriesForCategory(selectedCategory.value).map((s) => ({
    value: s.slug,
    label: s.label,
    icon: s.emoji,
  }));
});

// Get current emoji for display
const currentEmoji = computed(() => {
  return getSubcategoryEmoji(selectedCategory.value, selectedSubcategory.value);
});

// Category options for parent category selection
const categoryOptions = computed(() => {
  // Only show categories that make sense for timed activities
  const timedCategories = getTimedCategories();
  return timedCategories.map((slug) => {
    const category = CATEGORY_DEFAULTS[slug]!;
    return {
      value: slug,
      label: category.label,
      icon: category.emoji,
      color: category.color,
    };
  });
});

// When category changes, reset subcategory to first option
watch(selectedCategory, (newCategory) => {
  const subs = getSubcategoriesForCategory(newCategory);
  if (subs.length > 0 && subs[0]) {
    selectedSubcategory.value = subs[0].slug;
  } else {
    // Fallback if category has no subcategories
    console.warn(`Category ${newCategory} has no subcategories defined`);
    selectedSubcategory.value = newCategory; // Use category slug as fallback
  }
});

// Load settings from localStorage
onMounted(() => {
  try {
    const saved = localStorage.getItem("tada-settings");
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.defaultTimerMinutes) {
        targetMinutes.value = settings.defaultTimerMinutes * 60; // Convert minutes to seconds
      }
      if (settings.bellSound) {
        // Apply bell sound to both start and end for backward compatibility
        startBell.value = settings.bellSound;
        endBell.value = settings.bellSound;
      }
    }
  } catch (error) {
    console.error("Failed to load timer settings:", error);
  }
});

// Timer presets (includes 30s for debug only in dev mode)
const presets = computed(() => {
  const basePresets = [
    { label: "1m", seconds: 60 },
    { label: "3m", seconds: 180 },
    { label: "5m", seconds: 300 },
    { label: "6m", seconds: 360 },
    { label: "10m", seconds: 600 },
    { label: "15m", seconds: 900 },
    { label: "20m", seconds: 1200 },
    { label: "30m", seconds: 1800 },
    { label: "60m", seconds: 3600 },
    { label: "Custom", seconds: -1 },
    { label: "∞", seconds: 0 },
  ];

  // Add 30s debug preset in dev mode only
  if (import.meta.dev) {
    basePresets.unshift({ label: "30s", seconds: 30 });
  }

  return basePresets;
});

// Loop options
const loopOptions = [1, 2, 4, 5, 10, Infinity];

// Bell sounds
const bellSounds = [
  { value: "bell", label: "Bell" },
  { value: "chime", label: "Chime" },
  { value: "gong", label: "Gong" },
  { value: "gong2", label: "Gong 2" },
  { value: "cymbal", label: "Cymbal" },
  { value: "silence", label: "None" },
];

// Computed display values
const displayTime = computed(() => {
  if (timerMode.value === "countdown") {
    const targetSeconds = customMinutes.value
      ? parseInt(customMinutes.value) * 60
      : targetMinutes.value;
    const remaining = Math.max(0, targetSeconds - elapsedSeconds.value);
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
    const targetSeconds = customMinutes.value
      ? parseInt(customMinutes.value) * 60
      : targetMinutes.value;
    return (elapsedSeconds.value / targetSeconds) * 100;
  }
  return 0;
});

const isComplete = computed(() => {
  if (timerMode.value !== "countdown") return false;
  const targetSeconds = customMinutes.value
    ? parseInt(customMinutes.value) * 60
    : targetMinutes.value;
  return elapsedSeconds.value >= targetSeconds;
});

// Timer controls
function startTimer() {
  isRunning.value = true;
  isPaused.value = false;
  showSettings.value = false; // Hide settings when starting
  playBell("start"); // Play start bell

  // Request wake lock to keep screen on
  requestWakeLock();

  timerInterval.value = setInterval(() => {
    elapsedSeconds.value++;

    // Check for completion in countdown mode
    if (timerMode.value === "countdown") {
      const targetSeconds = customMinutes.value
        ? parseInt(customMinutes.value) * 60
        : targetMinutes.value;
      if (elapsedSeconds.value >= targetSeconds) {
        playBell();
        handleLoopOrComplete();
      }
    }
  }, 1000);
}

async function handleLoopOrComplete() {
  loopsCompleted.value++;
  if (loopsCompleted.value < loopCount.value) {
    // Loop: reset and continue
    elapsedSeconds.value = 0;
  } else {
    // All loops complete - auto-save
    showSettings.value = true; // Show settings again when complete
    stopTimer();
    await saveSession();
  }
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

    if (timerMode.value === "countdown") {
      const targetSeconds = customMinutes.value
        ? parseInt(customMinutes.value) * 60
        : targetMinutes.value;
      if (elapsedSeconds.value >= targetSeconds) {
        playBell();
        handleLoopOrComplete();
      }
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
  releaseWakeLock();
}

function resetTimer() {
  stopTimer();
  elapsedSeconds.value = 0;
  loopsCompleted.value = 0;
  customMinutes.value = "";
}

function playBell(bellType: "start" | "end" = "end") {
  const bellToPlay = bellType === "start" ? startBell.value : endBell.value;
  if (bellToPlay === "silence") return;

  const soundFiles: Record<string, string> = {
    bell: "/sounds/bell.mp3",
    chime: "/sounds/chime.mp3",
    gong: "/sounds/gong.mp3",
    gong2: "/sounds/gong2.mp3",
    cymbal: "/sounds/cymbal.mp3",
  };

  try {
    const audio = new Audio(soundFiles[bellToPlay]);
    audio.play().catch(() => {
      console.log("Bell sound failed to play");
    });
  } catch {
    console.log("Audio not available");
  }
}

async function saveSession() {
  if (elapsedSeconds.value < 1) return;

  isSaving.value = true;

  try {
    // Get the subcategory label for the name
    const subcatOption = subcategoryOptions.value.find(
      (s) => s.value === selectedSubcategory.value
    );
    const subcatLabel = subcatOption?.label || selectedSubcategory.value;

    const entry = {
      type: "timed",
      name: `${subcatLabel} (${Math.floor(elapsedSeconds.value / 60)}m)`,
      category: selectedCategory.value,
      subcategory: selectedSubcategory.value,
      timestamp: new Date().toISOString(),
      durationSeconds: elapsedSeconds.value,
      data: {
        mode: timerMode.value,
        targetMinutes:
          timerMode.value === "countdown" ? targetMinutes.value : null,
      },
      tags: [selectedCategory.value, selectedSubcategory.value],
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

// Wake Lock API - keep screen on during meditation
async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock.value = await navigator.wakeLock.request("screen");
      console.log("Wake lock acquired");
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log("Wake lock failed:", message);
  }
}

function releaseWakeLock() {
  if (wakeLock.value) {
    wakeLock.value.release().then(() => {
      wakeLock.value = null;
      console.log("Wake lock released");
    });
  }
}

// Cleanup on unmount
onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
  releaseWakeLock();
});
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[70vh]">
    <!-- Large emoji display during timer -->
    <div v-if="isRunning" class="text-6xl mb-4 animate-pulse">
      {{ currentEmoji }}
    </div>

    <!-- Category selector (only when not running) -->
    <div v-if="!isRunning" class="mb-4">
      <label
        class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2 text-center"
      >
        Category
      </label>
      <div class="flex flex-wrap gap-2 justify-center max-w-md">
        <button
          v-for="cat in categoryOptions"
          :key="cat.value"
          class="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          :class="
            selectedCategory === cat.value
              ? 'ring-2 ring-offset-2 dark:ring-offset-stone-900'
              : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
          "
          :style="
            selectedCategory === cat.value
              ? {
                  backgroundColor: cat.color + '20',
                  color: cat.color,
                  borderColor: cat.color,
                }
              : {}
          "
          @click="selectedCategory = cat.value"
        >
          <span>{{ cat.icon }}</span>
          <span>{{ cat.label }}</span>
        </button>
      </div>
    </div>

    <!-- Subcategory selector (only when not running) -->
    <div v-if="!isRunning" class="mb-6">
      <label
        class="block text-sm font-medium text-stone-600 dark:text-stone-300 mb-2 text-center"
      >
        Activity Type
      </label>
      <div class="flex flex-wrap gap-2 justify-center max-w-md">
        <button
          v-for="cat in subcategoryOptions"
          :key="cat.value"
          class="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          :class="
            selectedSubcategory === cat.value
              ? 'bg-tada-100 dark:bg-tada-900/50 text-tada-700 dark:text-tada-300 ring-2 ring-tada-500'
              : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
          "
          @click="selectedSubcategory = cat.value"
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
      class="flex flex-wrap gap-2 justify-center mb-4 max-w-lg"
    >
      <button
        v-for="preset in presets"
        :key="preset.label"
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="
          (preset.seconds === -1 && customMinutes) ||
          (preset.seconds > 0 &&
            targetMinutes === preset.seconds &&
            !customMinutes)
            ? 'bg-tada-100 dark:bg-tada-900/50 text-tada-700 dark:text-tada-300'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
        "
        @click="
          preset.seconds === -1
            ? null
            : preset.seconds === 0
            ? (timerMode = 'unlimited')
            : ((targetMinutes = preset.seconds), (customMinutes = ''))
        "
      >
        {{ preset.label }}
      </button>
    </div>

    <!-- Custom duration input (only when Custom is active) -->
    <div
      v-if="timerMode === 'countdown' && !isRunning && customMinutes !== ''"
      class="flex items-center gap-2 justify-center mb-4"
    >
      <input
        v-model="customMinutes"
        type="number"
        placeholder="minutes"
        class="w-20 px-2 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm"
        min="1"
        @input="customMinutes = customMinutes.replace(/^0+/, '')"
      />
      <span class="text-sm text-stone-600 dark:text-stone-300">minutes</span>
    </div>

    <!-- Settings Accordion (only when not running) -->
    <div v-if="!isRunning" class="w-full max-w-md px-4 mb-6">
      <button
        class="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
        @click="showSettings = !showSettings"
      >
        <span class="text-sm font-medium text-stone-700 dark:text-stone-300">
          Settings
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-stone-500 dark:text-stone-400 transition-transform"
          :class="{ 'rotate-180': showSettings }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <!-- Settings Panel -->
      <div
        v-show="showSettings"
        class="mt-2 p-4 rounded-lg bg-stone-50 dark:bg-stone-800/50 space-y-4"
      >
        <!-- Loop selector -->
        <div>
          <label
            class="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-2"
          >
            Loops
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="loop in loopOptions"
              :key="loop"
              class="px-2 py-1 rounded text-xs font-medium transition-colors"
              :class="
                loopCount === loop
                  ? 'bg-tada-100 dark:bg-tada-900/50 text-tada-700 dark:text-tada-300'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              "
              @click="loopCount = loop"
            >
              {{ loop === Infinity ? "∞" : loop }}
            </button>
          </div>
        </div>

        <!-- Start bell selector -->
        <div>
          <label
            class="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-2"
          >
            Start Bell
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="sound in bellSounds"
              :key="sound.value"
              class="px-2 py-1 rounded text-xs font-medium transition-colors"
              :class="
                startBell === sound.value
                  ? 'bg-tada-100 dark:bg-tada-900/50 text-tada-700 dark:text-tada-300'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              "
              @click="startBell = sound.value"
            >
              {{ sound.label }}
            </button>
          </div>
        </div>

        <!-- End bell selector -->
        <div>
          <label
            class="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-2"
          >
            End Bell
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="sound in bellSounds"
              :key="sound.value"
              class="px-2 py-1 rounded text-xs font-medium transition-colors"
              :class="
                endBell === sound.value
                  ? 'bg-tada-100 dark:bg-tada-900/50 text-tada-700 dark:text-tada-300'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              "
              @click="endBell = sound.value"
            >
              {{ sound.label }}
            </button>
          </div>
        </div>
      </div>
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

    <!-- Session complete message (only show save button, no text) -->
    <div v-if="isComplete && !isRunning" class="mt-8">
      <button
        :disabled="isSaving"
        class="px-6 py-3 rounded-lg bg-tada-600 hover:bg-tada-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center gap-2"
        @click="saveSession"
      >
        <svg
          v-if="!isSaving"
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
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
          class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"
        />
        {{ isSaving ? "Saving..." : "Save Session" }}
      </button>
    </div>
  </div>
</template>
