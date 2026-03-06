<script setup lang="ts">
/**
 * ExerciseInput — Input component for the exercise entry type module.
 *
 * Phase 5 validation: proves a new entry type can be built as a pure module.
 *
 * Features:
 * - Activity type picker (running, cycling, strength, yoga, etc.)
 * - Duration input
 * - Intensity selector (light, moderate, vigorous)
 * - Notes field
 */

const toast = useToast();
const { createEntry, isLoading: isSaving } = useEntryEngine();

// Form state
const activityName = ref("");
const durationMinutes = ref(30);
const intensity = ref<"light" | "moderate" | "vigorous">("moderate");
const notes = ref("");

// Preset activities
const presetActivities = [
  { name: "Running", emoji: "🏃" },
  { name: "Cycling", emoji: "🚴" },
  { name: "Swimming", emoji: "🏊" },
  { name: "Weight Training", emoji: "🏋️" },
  { name: "Yoga", emoji: "🧘" },
  { name: "Walking", emoji: "🚶" },
  { name: "HIIT", emoji: "⚡" },
  { name: "Stretching", emoji: "🤸" },
];

// Select a preset activity
function selectPreset(preset: { name: string; emoji: string }) {
  activityName.value = preset.name;
}

// Recent exercise entries
const recentEntries = ref<Array<Record<string, unknown>>>([]);

onMounted(async () => {
  try {
    const response = await $fetch<{
      entries: Array<Record<string, unknown>>;
    }>("/api/entries", {
      params: { type: "exercise", limit: 10 },
    });
    recentEntries.value = response.entries;
  } catch {
    // Non-critical, continue without recent entries
  }
});

// Save exercise entry
async function saveExercise() {
  if (!activityName.value.trim()) {
    toast.error("Please enter an activity name");
    return;
  }

  if (durationMinutes.value <= 0) {
    toast.error("Please enter a valid duration");
    return;
  }

  const preset = presetActivities.find(
    (p) => p.name.toLowerCase() === activityName.value.toLowerCase(),
  );

  await createEntry({
    type: "exercise",
    name: activityName.value.trim(),
    category: "movement",
    subcategory: "exercise",
    emoji: preset?.emoji || "💪",
    timestamp: new Date().toISOString(),
    durationSeconds: durationMinutes.value * 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notes: notes.value || undefined,
    data: {
      intensity: intensity.value,
    },
    tags: [intensity.value],
  });

  // Reset form
  activityName.value = "";
  durationMinutes.value = 30;
  intensity.value = "moderate";
  notes.value = "";

  // Refresh recent entries
  try {
    const response = await $fetch<{
      entries: Array<Record<string, unknown>>;
    }>("/api/entries", {
      params: { type: "exercise", limit: 10 },
    });
    recentEntries.value = response.entries;
  } catch {
    // Non-critical
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
    <!-- Header -->
    <div>
      <h1
        class="text-2xl font-semibold text-text-light dark:text-text-dark"
      >
        💪 Log Exercise
      </h1>
      <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
        Track your workout
      </p>
    </div>

    <!-- Preset Activities -->
    <div>
      <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
        Quick Select
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in presetActivities"
          :key="preset.name"
          :class="[
            'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            activityName === preset.name
              ? 'bg-red-500 text-white'
              : 'bg-white dark:bg-cosmic-indigo border border-pearl-mist dark:border-cosmic-indigo-light text-text-light dark:text-text-dark hover:border-red-300 dark:hover:border-red-600',
          ]"
          @click="selectPreset(preset)"
        >
          {{ preset.emoji }} {{ preset.name }}
        </button>
      </div>
    </div>

    <!-- Activity Name -->
    <div>
      <label
        for="activity-name"
        class="block text-sm font-medium text-text-light dark:text-text-dark mb-1"
      >
        Activity
      </label>
      <input
        id="activity-name"
        v-model="activityName"
        type="text"
        placeholder="e.g. Morning Run"
        class="w-full px-4 py-2 rounded-lg border border-pearl-mist dark:border-cosmic-indigo-light bg-white dark:bg-cosmic-indigo text-text-light dark:text-text-dark placeholder-text-light-muted dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-red-500"
      />
    </div>

    <!-- Duration -->
    <div>
      <label
        for="duration"
        class="block text-sm font-medium text-text-light dark:text-text-dark mb-1"
      >
        Duration (minutes)
      </label>
      <div class="flex items-center gap-3">
        <button
          class="w-10 h-10 rounded-lg bg-white dark:bg-cosmic-indigo border border-pearl-mist dark:border-cosmic-indigo-light text-text-light dark:text-text-dark hover:bg-stone-50 dark:hover:bg-cosmic-indigo-light transition-colors"
          @click="durationMinutes = Math.max(1, durationMinutes - 5)"
        >
          -
        </button>
        <input
          id="duration"
          v-model.number="durationMinutes"
          type="number"
          min="1"
          class="w-24 px-4 py-2 rounded-lg border border-pearl-mist dark:border-cosmic-indigo-light bg-white dark:bg-cosmic-indigo text-text-light dark:text-text-dark text-center focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button
          class="w-10 h-10 rounded-lg bg-white dark:bg-cosmic-indigo border border-pearl-mist dark:border-cosmic-indigo-light text-text-light dark:text-text-dark hover:bg-stone-50 dark:hover:bg-cosmic-indigo-light transition-colors"
          @click="durationMinutes += 5"
        >
          +
        </button>
      </div>
    </div>

    <!-- Intensity -->
    <div>
      <label class="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
        Intensity
      </label>
      <div class="flex gap-2">
        <button
          v-for="level in (['light', 'moderate', 'vigorous'] as const)"
          :key="level"
          :class="[
            'flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
            intensity === level
              ? level === 'light'
                ? 'bg-green-500 text-white'
                : level === 'moderate'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-red-500 text-white'
              : 'bg-white dark:bg-cosmic-indigo border border-pearl-mist dark:border-cosmic-indigo-light text-text-light dark:text-text-dark',
          ]"
          @click="intensity = level"
        >
          {{ level }}
        </button>
      </div>
    </div>

    <!-- Notes -->
    <div>
      <label
        for="notes"
        class="block text-sm font-medium text-text-light dark:text-text-dark mb-1"
      >
        Notes (optional)
      </label>
      <textarea
        id="notes"
        v-model="notes"
        rows="2"
        placeholder="How did it feel?"
        class="w-full px-4 py-2 rounded-lg border border-pearl-mist dark:border-cosmic-indigo-light bg-white dark:bg-cosmic-indigo text-text-light dark:text-text-dark placeholder-text-light-muted dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
      />
    </div>

    <!-- Save Button -->
    <button
      :disabled="isSaving || !activityName.trim()"
      class="w-full py-3 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      @click="saveExercise"
    >
      {{ isSaving ? "Saving..." : "Log Exercise" }}
    </button>

    <!-- Recent Exercises -->
    <div v-if="recentEntries.length > 0">
      <h2 class="text-lg font-medium text-text-light dark:text-text-dark mb-3">
        Recent Exercises
      </h2>
      <div class="space-y-2">
        <div
          v-for="entry in recentEntries"
          :key="String(entry['id'])"
          class="p-3 bg-white dark:bg-cosmic-indigo rounded-lg border border-pearl-mist dark:border-cosmic-indigo-light"
        >
          <div class="flex items-center justify-between">
            <div>
              <span class="font-medium text-text-light dark:text-text-dark">
                {{ entry['emoji'] || '💪' }} {{ entry['name'] }}
              </span>
              <span
                v-if="entry['durationSeconds']"
                class="text-sm text-text-light-secondary dark:text-text-dark-secondary ml-2"
              >
                {{ formatDuration(entry['durationSeconds'] as number) }}
              </span>
            </div>
            <span class="text-xs text-text-light-muted dark:text-text-dark-muted">
              {{ new Date(entry['timestamp'] as string).toLocaleDateString() }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
