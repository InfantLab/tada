<script setup lang="ts">
// Timer page - meditation and timed activity timer
import {
  CATEGORY_DEFAULTS,
  getSubcategoriesForCategory,
  getSubcategoryEmoji,
  getTimedCategories,
} from "~/utils/categoryDefaults";
import type { TimerPreset } from "~/server/db/schema";

const { error: showError } = useToast();

definePageMeta({
  layout: "default",
});

// Timer state
const timerMode = ref<"fixed" | "unlimited">("unlimited");
const targetMinutes = ref(600); // seconds for single-interval fallback
const elapsedSeconds = ref(0);
const isRunning = ref(false);
const isPaused = ref(false);
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null);
const isWarmingUp = ref(false);
const warmUpSeconds = ref<number>(10);
const customWarmUpSeconds = ref<string>("");

// Interval configuration - unified for both modes
interface TimerInterval {
  durationMinutes: number;
  repeats: number; // 0 = forever
  bellSound: string;
  customDuration: string; // for custom input
}

const intervals = ref<TimerInterval[]>([
  { durationMinutes: 10, repeats: 0, bellSound: "bell", customDuration: "" },
]);

// Legacy compat
const fixedIntervals = computed(() => {
  // Build the full sequence of intervals in seconds
  const result: number[] = [];
  for (const int of intervals.value) {
    const durationSec = int.durationMinutes * 60;
    if (int.repeats === 0) {
      // "Forever" - for fixed mode, we just use one occurrence
      // For unlimited, this drives the milestone interval
      result.push(durationSec);
    } else {
      for (let i = 0; i < int.repeats; i++) {
        result.push(durationSec);
      }
    }
  }
  return result;
});

const nextIntervalIndex = ref(0); // index in cumulative targets
const isOvertime = ref(false);
const overtimeSeconds = ref(0);
const ringsCount = ref(0);

// Milestone interval for unlimited mode (derived from first interval)
const milestoneInterval = computed(() => {
  if (intervals.value.length > 0 && intervals.value[0]) {
    return intervals.value[0].durationMinutes;
  }
  return 10;
});

// Category hierarchy - parent category and subcategory
const selectedCategory = ref("mindfulness");
const selectedSubcategory = ref("sitting");

// User preferences for filtering categories
const { loadPreferences, isCategoryVisible } = usePreferences();

// Load preferences on mount
onMounted(() => {
  loadPreferences();
});

// Preset state
const selectedPresetId = ref<string | null>(null);
const presetPickerRef = ref<InstanceType<
  typeof import("~/components/TimerPresetPicker.vue").default
> | null>(null);

const isSaving = ref(false);
const startBell = ref("bell");
const milestoneFired = ref<Set<number>>(new Set()); // Track which milestones have fired
const showSettings = ref(false);
const wakeLock = ref<WakeLockSentinel | null>(null);
const expandedIntervalIndex = ref(0); // Which interval accordion is open
const noIntervalBells = ref(false); // Unlimited timer with no interval bells
const warmUpCountdown = ref(0); // For displaying countdown during warm-up

// Check if interval at index is disabled (after a "forever" interval)
function isIntervalDisabled(idx: number): boolean {
  for (let i = 0; i < idx; i++) {
    if (intervals.value[i]?.repeats === 0) {
      return true;
    }
  }
  return false;
}

// Get interval summary for collapsed view
function getIntervalSummary(int: TimerInterval): string {
  const repeatText = int.repeats === 0 ? "∞" : `×${int.repeats}`;
  return `${int.durationMinutes}m ${repeatText}`;
}

// Post-session capture (global settings from localStorage)
const captureMood = ref(false);
const captureReflection = ref(false);
const showPostSessionModal = ref(false);
const sessionMood = ref<number | null>(null);
const sessionReflection = ref("");
const pendingIncludeOvertime = ref(true);

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
  // Filter out hidden categories
  const visibleCategories = timedCategories.filter((slug) =>
    isCategoryVisible(slug)
  );
  return visibleCategories.map((slug) => {
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
      // Global post-session capture settings
      if (typeof settings.captureMood === "boolean") {
        captureMood.value = settings.captureMood;
      }
      if (typeof settings.captureReflection === "boolean") {
        captureReflection.value = settings.captureReflection;
      }
    }
  } catch (error) {
    console.error("Failed to load timer settings:", error);
  }
});

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
  const mins = Math.floor(elapsedSeconds.value / 60);
  const secs = elapsedSeconds.value % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
});

const overtimeDisplay = computed(() => {
  const mins = Math.floor(overtimeSeconds.value / 60);
  const secs = overtimeSeconds.value % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
});

// Progress within current interval (0-100%), resets each interval
const intervalProgress = computed(() => {
  if (timerMode.value === "fixed") {
    const intrvls =
      fixedIntervals.value.length > 0
        ? fixedIntervals.value
        : [targetMinutes.value];
    const cumulative = buildCumulativeTargets(intrvls);
    const prevTarget =
      nextIntervalIndex.value > 0 ? cumulative[nextIntervalIndex.value - 1] : 0;
    const currentTarget =
      cumulative[nextIntervalIndex.value] ?? cumulative[cumulative.length - 1];
    const intervalLength = currentTarget - prevTarget;
    const elapsedInInterval = elapsedSeconds.value - prevTarget;
    if (isOvertime.value) return 100; // Full ring during overtime
    return Math.min(100, (elapsedInInterval / intervalLength) * 100);
  }
  // Unlimited: progress within current celebration interval
  const intervalSecs = milestoneInterval.value * 60;
  const elapsedInInterval = elapsedSeconds.value % intervalSecs;
  return (elapsedInInterval / intervalSecs) * 100;
});

const _isComplete = computed(() => {
  if (timerMode.value !== "fixed") return false;
  const totalTarget = fixedIntervals.value.reduce((a, b) => a + b, 0);
  return elapsedSeconds.value >= totalTarget;
});

// Milestone-based bell trigger for count-up mode
function checkMilestones() {
  if (timerMode.value !== "unlimited") return;
  const currentMinutes = Math.floor(elapsedSeconds.value / 60);
  const milestone =
    Math.floor(currentMinutes / milestoneInterval.value) *
    milestoneInterval.value;

  // Only fire if this milestone hasn't fired yet and we're at a real milestone
  if (
    milestone > 0 &&
    currentMinutes >= milestone &&
    !milestoneFired.value.has(milestone)
  ) {
    milestoneFired.value.add(milestone);
    ringsCount.value += 1;
    playBell("interval", 0); // Use first interval's bell for unlimited mode
  }
}

function buildCumulativeTargets(intervals: number[]): number[] {
  const result: number[] = [];
  let sum = 0;
  for (const s of intervals) {
    sum += s;
    result.push(sum);
  }
  return result;
}

function beginSession() {
  isRunning.value = true;
  isPaused.value = false;
  showSettings.value = false; // Hide settings when starting
  playBell("start"); // Play start bell

  // Request wake lock to keep screen on
  requestWakeLock();

  // Reset milestone tracking for new session
  milestoneFired.value = new Set();
  ringsCount.value = 0;
  isOvertime.value = false;
  overtimeSeconds.value = 0;
  nextIntervalIndex.value = 0;

  timerInterval.value = setInterval(() => {
    elapsedSeconds.value++;

    // Check for milestones in count-up mode
    if (timerMode.value === "unlimited") {
      checkMilestones();
    }

    // Fixed mode interval boundaries and overtime
    if (timerMode.value === "fixed") {
      const intrvls =
        fixedIntervals.value.length > 0
          ? fixedIntervals.value
          : [targetMinutes.value];
      const cumulative = buildCumulativeTargets(intrvls);

      if (!isOvertime.value && nextIntervalIndex.value < cumulative.length) {
        const target = cumulative[nextIntervalIndex.value];
        if (elapsedSeconds.value >= target) {
          ringsCount.value += 1;
          playBell("interval", nextIntervalIndex.value);
          nextIntervalIndex.value += 1;
          if (nextIntervalIndex.value >= cumulative.length) {
            // Enter overtime (keep accumulating silently, with small sub-timer)
            isOvertime.value = true;
          }
        }
      } else if (isOvertime.value) {
        overtimeSeconds.value += 1;
      }
    }
  }, 1000);
}

// Timer controls
function startTimer() {
  // Warm-up phase (silence), then begin session
  if (warmUpSeconds.value > 0) {
    isWarmingUp.value = true;
    warmUpCountdown.value = warmUpSeconds.value;
    // Ensure no existing interval
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
    // Show running state during warm-up
    isRunning.value = true;
    showSettings.value = false;

    // Countdown interval for warm-up display
    timerInterval.value = setInterval(() => {
      warmUpCountdown.value--;
      if (warmUpCountdown.value <= 0) {
        clearInterval(timerInterval.value!);
        timerInterval.value = null;
        isWarmingUp.value = false;
        beginSession();
      }
    }, 1000);
  } else {
    beginSession();
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
  // If resuming from warm-up, continue countdown
  if (isWarmingUp.value) {
    timerInterval.value = setInterval(() => {
      warmUpCountdown.value--;
      if (warmUpCountdown.value <= 0) {
        clearInterval(timerInterval.value!);
        timerInterval.value = null;
        isWarmingUp.value = false;
        beginSession();
      }
    }, 1000);
    return;
  }
  timerInterval.value = setInterval(() => {
    elapsedSeconds.value++;

    // Check for milestones in count-up mode
    if (timerMode.value === "unlimited") {
      checkMilestones();
    }

    if (timerMode.value === "fixed") {
      const intrvls =
        fixedIntervals.value.length > 0
          ? fixedIntervals.value
          : [targetMinutes.value];
      const cumulative = buildCumulativeTargets(intrvls);
      if (!isOvertime.value && nextIntervalIndex.value < cumulative.length) {
        const target = cumulative[nextIntervalIndex.value];
        if (elapsedSeconds.value >= target) {
          ringsCount.value += 1;
          playBell("interval", nextIntervalIndex.value);
          nextIntervalIndex.value += 1;
          if (nextIntervalIndex.value >= cumulative.length) {
            isOvertime.value = true;
          }
        }
      } else if (isOvertime.value) {
        overtimeSeconds.value += 1;
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
  isWarmingUp.value = false;
  isOvertime.value = false;
  overtimeSeconds.value = 0;
  ringsCount.value = 0;
  nextIntervalIndex.value = 0;
  sessionMood.value = null;
  sessionReflection.value = "";
  showPostSessionModal.value = false;
}

function playBell(
  bellType: "start" | "interval" = "interval",
  intervalIndex: number = 0
) {
  // Skip interval bells if noIntervalBells is enabled
  if (bellType === "interval" && noIntervalBells.value) return;

  let bellToPlay: string;

  if (bellType === "start") {
    bellToPlay = startBell.value;
  } else {
    // Get bell from the specific interval configuration
    // Map intervalIndex in fixedIntervals back to intervals array
    let count = 0;
    for (const int of intervals.value) {
      const reps = int.repeats === 0 ? 1 : int.repeats;
      if (intervalIndex < count + reps) {
        bellToPlay = int.bellSound;
        break;
      }
      count += reps;
    }
    bellToPlay = bellToPlay! || intervals.value[0]?.bellSound || "bell";
  }

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

// Triggered by Save button - show modal if capture settings enabled
function requestSave(includeOvertime: boolean = true) {
  if (elapsedSeconds.value < 1) return;
  stopTimer();

  // If mood or reflection capture is enabled, show modal first
  if (captureMood.value || captureReflection.value) {
    pendingIncludeOvertime.value = includeOvertime;
    showPostSessionModal.value = true;
  } else {
    saveSession(includeOvertime);
  }
}

// Called from modal or directly
async function saveSession(includeOvertime: boolean = true) {
  if (elapsedSeconds.value < 1) return;

  isSaving.value = true;
  showPostSessionModal.value = false;

  try {
    // Get the subcategory label for the name
    const subcatOption = subcategoryOptions.value.find(
      (s) => s.value === selectedSubcategory.value
    );
    const subcatLabel = subcatOption?.label || selectedSubcategory.value;
    const minutes = Math.floor(elapsedSeconds.value / 60);

    // Celebratory messaging: "You did 47 minutes!"
    const celebrateMessages = [
      `You did ${minutes}m of ${subcatLabel}!`,
      `${minutes} minutes of ${subcatLabel} - awesome!`,
      `You showed up for ${minutes}m of ${subcatLabel}!`,
      `${minutes} minutes well spent on ${subcatLabel}!`,
    ];
    const celebrationMessage =
      celebrateMessages[Math.floor(Math.random() * celebrateMessages.length)];

    const totalFixedSeconds = fixedIntervals.value.reduce((a, b) => a + b, 0);
    const durationToSave =
      timerMode.value === "fixed"
        ? includeOvertime && isOvertime.value
          ? totalFixedSeconds + overtimeSeconds.value
          : totalFixedSeconds
        : elapsedSeconds.value;

    const entry = {
      type: "timed",
      name: celebrationMessage,
      category: selectedCategory.value,
      subcategory: selectedSubcategory.value,
      timestamp: new Date().toISOString(),
      durationSeconds: durationToSave,
      data: {
        mode: timerMode.value,
        intervals: intervals.value.map((int) => ({
          durationMinutes: int.durationMinutes,
          repeats: int.repeats,
          bellSound: int.bellSound,
        })),
        warmUpSeconds: warmUpSeconds.value,
        mood: sessionMood.value,
        reflection: sessionReflection.value || undefined,
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
    showError(`Failed to save session: ${message}`);
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

// Preset handling

function handlePresetSelect(preset: TimerPreset) {
  // Apply preset settings
  selectedCategory.value = preset.category || "mindfulness";
  selectedSubcategory.value = preset.subcategory || "sitting";

  // Determine timer mode based on duration
  if (preset.durationSeconds) {
    timerMode.value = "fixed";
    targetMinutes.value = Math.floor(preset.durationSeconds / 60);
  } else {
    timerMode.value = "unlimited";
  }

  // Apply bell config if present
  if (preset.bellConfig) {
    if (preset.bellConfig.startBell) {
      startBell.value = preset.bellConfig.startBell.replace(".mp3", "");
    }
    if (
      preset.bellConfig.intervalBells &&
      Array.isArray(preset.bellConfig.intervalBells)
    ) {
      intervals.value = preset.bellConfig.intervalBells.map((int) => ({
        durationMinutes: int.minutes,
        repeats: 1,
        bellSound: int.sound || "bell.mp3",
        customDuration: "",
      }));
    }
  }
}

function openSavePresetDialog() {
  if (!presetPickerRef.value) return;

  // Gather current settings - matching schema structure
  const presetData = {
    category: selectedCategory.value,
    subcategory: selectedSubcategory.value,
    durationSeconds:
      timerMode.value === "fixed" ? targetMinutes.value * 60 : null,
    bellConfig: {
      startBell: startBell.value + ".mp3",
      endBell: startBell.value + ".mp3",
      intervalBells: intervals.value
        .filter((int) => int.durationMinutes > 0)
        .map((int) => ({
          minutes: int.durationMinutes,
          sound: int.bellSound,
        })),
    },
    backgroundAudio: null,
    isDefault: false,
  };

  presetPickerRef.value.openSaveDialog(presetData);
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
              ? 'bg-tada-100/30 dark:bg-tada-600/20 text-tada-700 dark:text-tada-300 ring-2 ring-tada-500 dark:ring-tada-500'
              : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
          "
          @click="selectedSubcategory = cat.value"
        >
          <span>{{ cat.icon }}</span>
          <span>{{ cat.label }}</span>
        </button>
      </div>
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
        class="mt-2 p-4 rounded-lg bg-stone-50 dark:bg-stone-800/50 space-y-5"
      >
        <!-- Presets Section -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label
              class="block text-xs font-medium text-stone-600 dark:text-stone-300"
              >Presets</label
            >
            <button
              class="text-xs text-tada-600 dark:text-tada-400 hover:underline"
              @click="openSavePresetDialog"
            >
              Save current as preset
            </button>
          </div>
          <TimerPresetPicker
            ref="presetPickerRef"
            v-model="selectedPresetId"
            @select="handlePresetSelect"
          />
        </div>

        <hr class="border-stone-200 dark:border-stone-700" />

        <!-- Mode selector (center aligned) -->
        <div class="text-center">
          <label
            class="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-2"
            >Mode</label
          >
          <div class="inline-flex gap-2">
            <button
              class="px-4 py-1.5 rounded text-sm font-medium transition-colors"
              :class="
                timerMode === 'fixed'
                  ? 'bg-tada-100/30 dark:bg-tada-600/20 text-tada-700 dark:text-tada-300'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              "
              @click="timerMode = 'fixed'"
            >
              Fixed
            </button>
            <button
              class="px-4 py-1.5 rounded text-sm font-medium transition-colors"
              :class="
                timerMode === 'unlimited'
                  ? 'bg-tada-100/30 dark:bg-tada-600/20 text-tada-700 dark:text-tada-300'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              "
              @click="timerMode = 'unlimited'"
            >
              Unlimited
            </button>
          </div>
        </div>

        <!-- Warm-up selector -->
        <div>
          <label
            class="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-2"
            >Warm-up</label
          >
          <div class="flex flex-wrap gap-2">
            <button
              v-for="sec in [0, 5, 10, 20]"
              :key="sec"
              class="px-2 py-1 rounded text-xs font-medium transition-colors"
              :class="
                warmUpSeconds === sec && !customWarmUpSeconds
                  ? 'bg-tada-100/30 dark:bg-tada-600/20 text-tada-700 dark:text-tada-300'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              "
              @click="
                warmUpSeconds = sec;
                customWarmUpSeconds = '';
              "
            >
              {{ sec === 0 ? "None" : sec + "s" }}
            </button>
            <input
              v-model="customWarmUpSeconds"
              type="number"
              placeholder="Custom"
              min="0"
              class="w-16 px-2 py-1 rounded text-xs border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100"
              @input="warmUpSeconds = parseInt(customWarmUpSeconds) || 0"
            />
          </div>
        </div>

        <!-- Start Bell -->
        <div>
          <label
            class="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-2"
            >Start Bell</label
          >
          <div class="flex flex-wrap gap-2">
            <button
              v-for="sound in bellSounds"
              :key="sound.value"
              class="px-2 py-1 rounded text-xs font-medium transition-colors"
              :class="
                startBell === sound.value
                  ? 'bg-tada-100/30 dark:bg-tada-600/20 text-tada-700 dark:text-tada-300'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              "
              @click="startBell = sound.value"
            >
              {{ sound.label }}
            </button>
          </div>
        </div>

        <!-- Intervals section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label
              class="block text-xs font-medium text-stone-600 dark:text-stone-300"
              >Intervals</label
            >
            <!-- No bells toggle -->
            <button
              class="text-xs transition-colors"
              :class="
                noIntervalBells
                  ? 'text-tada-600 dark:text-tada-400'
                  : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
              "
              @click="noIntervalBells = !noIntervalBells"
            >
              {{ noIntervalBells ? "🔕 No bells" : "🔔 With bells" }}
            </button>
          </div>

          <!-- Interval accordion rows -->
          <div
            class="space-y-2"
            :class="{ 'opacity-40 pointer-events-none': noIntervalBells }"
          >
            <div
              v-for="(int, idx) in intervals"
              :key="idx"
              class="rounded-lg bg-stone-100 dark:bg-stone-700/50 overflow-hidden transition-opacity"
              :class="{
                'opacity-40 pointer-events-none': isIntervalDisabled(idx),
              }"
            >
              <!-- Accordion header (always visible) -->
              <button
                class="w-full px-3 py-2 flex items-center justify-between text-left"
                @click="
                  expandedIntervalIndex =
                    expandedIntervalIndex === idx ? -1 : idx
                "
              >
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs font-medium text-stone-500 dark:text-stone-400"
                    >{{ idx + 1 }}.</span
                  >
                  <span class="text-xs text-stone-700 dark:text-stone-200">{{
                    getIntervalSummary(int)
                  }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    v-if="intervals.length > 1"
                    class="text-xs text-stone-400 hover:text-red-500"
                    @click.stop="intervals.splice(idx, 1)"
                    >×</span
                  >
                  <svg
                    class="w-4 h-4 text-stone-400 transition-transform"
                    :class="{ 'rotate-180': expandedIntervalIndex === idx }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              <!-- Accordion content (expanded) -->
              <div
                v-show="expandedIntervalIndex === idx"
                class="px-3 pb-3 space-y-3 border-t border-stone-200 dark:border-stone-600"
              >
                <!-- Duration selector -->
                <div class="pt-2">
                  <label
                    class="block text-xs text-stone-500 dark:text-stone-400 mb-1"
                    >Duration</label
                  >
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="mins in [3, 5, 6, 10, 15, 20, 30]"
                      :key="mins"
                      class="px-2 py-1 rounded text-xs font-medium transition-colors"
                      :class="
                        int.durationMinutes === mins && !int.customDuration
                          ? 'bg-tada-100/30 dark:bg-tada-600/20 text-tada-700 dark:text-tada-300'
                          : 'bg-white dark:bg-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-500'
                      "
                      @click="
                        int.durationMinutes = mins;
                        int.customDuration = '';
                      "
                    >
                      {{ mins }}m
                    </button>
                    <input
                      v-model="int.customDuration"
                      type="number"
                      placeholder="Custom"
                      min="1"
                      class="w-16 px-2 py-1 rounded text-xs border border-stone-300 dark:border-stone-500 bg-white dark:bg-stone-600 text-stone-800 dark:text-stone-100"
                      @input="
                        int.durationMinutes =
                          parseInt(int.customDuration) || int.durationMinutes
                      "
                    />
                  </div>
                </div>

                <!-- Repeats selector -->
                <div>
                  <label
                    class="block text-xs text-stone-500 dark:text-stone-400 mb-1"
                    >Repeats</label
                  >
                  <div class="flex items-center gap-2">
                    <button
                      class="px-2 py-1 rounded text-xs font-medium transition-colors"
                      :class="
                        int.repeats === 0
                          ? 'bg-tada-100/30 dark:bg-tada-600/20 text-tada-700 dark:text-tada-300'
                          : 'bg-white dark:bg-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-500'
                      "
                      @click="int.repeats = 0"
                    >
                      Forever
                    </button>
                    <div class="flex items-center gap-1">
                      <input
                        :value="int.repeats || ''"
                        type="number"
                        min="1"
                        placeholder="×"
                        class="w-12 px-2 py-1 rounded text-xs border border-stone-300 dark:border-stone-500 bg-white dark:bg-stone-600 text-stone-800 dark:text-stone-100 text-center"
                        @input="
                          int.repeats =
                            parseInt(
                              ($event.target as HTMLInputElement).value
                            ) || 0
                        "
                      />
                      <span class="text-xs text-stone-500 dark:text-stone-400"
                        >times</span
                      >
                    </div>
                  </div>
                </div>

                <!-- End Bell -->
                <div>
                  <label
                    class="block text-xs text-stone-500 dark:text-stone-400 mb-1"
                    >End Bell</label
                  >
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="sound in bellSounds"
                      :key="sound.value"
                      class="px-2 py-1 rounded text-xs font-medium transition-colors"
                      :class="
                        int.bellSound === sound.value
                          ? 'bg-tada-100/30 dark:bg-tada-600/20 text-tada-700 dark:text-tada-300'
                          : 'bg-white dark:bg-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-500'
                      "
                      @click="int.bellSound = sound.value"
                    >
                      {{ sound.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Add interval button -->
            <button
              v-if="!intervals.some((i) => i.repeats === 0)"
              class="w-full px-3 py-2 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-600 text-xs font-medium text-stone-500 dark:text-stone-400 hover:border-tada-500 hover:text-tada-600 dark:hover:border-tada-400 dark:hover:text-tada-400 transition-colors"
              @click="
                intervals.push({
                  durationMinutes: 10,
                  repeats: 1,
                  bellSound: 'bell',
                  customDuration: '',
                });
                expandedIntervalIndex = intervals.length - 1;
              "
            >
              + Add Interval
            </button>
          </div>
        </div>

        <!-- End of session options (styled as toggles) -->
        <div
          class="pt-2 border-t border-stone-200 dark:border-stone-700 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs text-stone-600 dark:text-stone-300"
              >Ending Reflection</span
            >
            <button
              class="relative w-10 h-5 rounded-full transition-colors"
              :class="
                captureReflection
                  ? 'bg-tada-600'
                  : 'bg-stone-300 dark:bg-stone-600'
              "
              @click="captureReflection = !captureReflection"
            >
              <span
                class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                :class="{ 'translate-x-5': captureReflection }"
              />
            </button>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-stone-600 dark:text-stone-300"
              >Ending Mood</span
            >
            <button
              class="relative w-10 h-5 rounded-full transition-colors"
              :class="
                captureMood ? 'bg-tada-600' : 'bg-stone-300 dark:bg-stone-600'
              "
              @click="captureMood = !captureMood"
            >
              <span
                class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                :class="{ 'translate-x-5': captureMood }"
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Timer display -->
    <div class="relative mb-8 flex flex-col items-center justify-center">
      <!-- Progress ring (fills per interval, resets) -->
      <svg class="w-64 h-64 transform -rotate-90" viewBox="0 0 100 100">
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
          class="text-tada-500 dark:text-tada-400 transition-all duration-1000"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          fill="none"
          r="45"
          cx="50"
          cy="50"
          :stroke-dasharray="283"
          :stroke-dashoffset="283 - (intervalProgress / 100) * 283"
        />
      </svg>

      <!-- Time display (centered on ring) -->
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span
          v-if="isWarmingUp"
          class="font-mono font-light tracking-tight text-5xl text-stone-500 dark:text-stone-400"
        >
          -{{ warmUpCountdown }}
        </span>
        <span
          v-else
          class="font-mono font-light tracking-tight text-5xl text-stone-800 dark:text-stone-100"
        >
          {{ displayTime }}
        </span>
        <div v-if="!isWarmingUp" class="flex items-center gap-3 mt-1">
          <span class="text-xs text-stone-500 dark:text-stone-400"
            >elapsed</span
          >
          <span
            v-if="ringsCount > 0"
            class="text-xs text-stone-500 dark:text-stone-400"
            >🔔 {{ ringsCount }}</span
          >
        </div>
        <div
          v-if="isWarmingUp"
          class="mt-1 text-xs text-stone-500 dark:text-stone-400"
        >
          settling in…
        </div>
        <div
          v-if="isOvertime"
          class="mt-1 text-xs text-stone-500 dark:text-stone-400"
        >
          +{{ overtimeDisplay }} overtime
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex gap-4">
      <!-- Not running state -->
      <template v-if="!isRunning">
        <button
          class="w-20 h-20 rounded-full bg-tada-600 hover:opacity-90 text-black dark:bg-tada-600 dark:text-white dark:hover:opacity-90 flex items-center justify-center shadow-lg transition-colors"
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
          class="w-20 h-20 rounded-full bg-tada-600 hover:opacity-90 text-black dark:bg-tada-600 dark:text-white dark:hover:opacity-90 disabled:bg-stone-300 disabled:cursor-not-allowed flex items-center justify-center shadow-lg transition-colors"
          @click="requestSave(true)"
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

        <!-- Save fixed only (visible in overtime for fixed mode) -->
        <button
          v-if="timerMode === 'fixed' && isOvertime && !isSaving"
          class="w-auto px-4 h-16 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 flex items-center justify-center shadow transition-colors text-sm"
          @click="requestSave(false)"
        >
          Save fixed only
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

    <!-- Post-session capture modal -->
    <div
      v-if="showPostSessionModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div
        class="bg-white dark:bg-stone-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6"
      >
        <h2
          class="text-xl font-semibold text-stone-800 dark:text-stone-100 text-center"
        >
          How was your session?
        </h2>

        <!-- Mood capture -->
        <div v-if="captureMood" class="space-y-2">
          <label
            class="block text-sm font-medium text-stone-600 dark:text-stone-300"
          >
            Mood
          </label>
          <div class="flex justify-center gap-2">
            <button
              v-for="mood in [1, 2, 3, 4, 5]"
              :key="mood"
              class="w-12 h-12 rounded-full text-2xl transition-all"
              :class="
                sessionMood === mood
                  ? 'bg-tada-100 dark:bg-tada-600/30 ring-2 ring-tada-500 scale-110'
                  : 'bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600'
              "
              @click="sessionMood = mood"
            >
              {{ ["😔", "😐", "🙂", "😊", "🤩"][mood - 1] }}
            </button>
          </div>
        </div>

        <!-- Reflection capture -->
        <div v-if="captureReflection" class="space-y-2">
          <label
            class="block text-sm font-medium text-stone-600 dark:text-stone-300"
          >
            Reflection (optional)
          </label>
          <textarea
            v-model="sessionReflection"
            placeholder="Any thoughts from this session?"
            rows="3"
            class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 text-sm resize-none"
          />
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            class="flex-1 px-4 py-2 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 font-medium transition-colors"
            @click="
              showPostSessionModal = false;
              saveSession(pendingIncludeOvertime);
            "
          >
            Skip
          </button>
          <button
            :disabled="isSaving"
            class="flex-1 px-4 py-2 rounded-lg bg-tada-600 hover:opacity-90 text-black dark:text-white font-medium transition-colors disabled:opacity-50"
            @click="saveSession(pendingIncludeOvertime)"
          >
            {{ isSaving ? "Saving..." : "Save" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
