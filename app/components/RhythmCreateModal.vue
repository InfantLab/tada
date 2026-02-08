<script setup lang="ts">
/**
 * RhythmCreateModal - Modal for creating or editing rhythms
 *
 * Features:
 * - Name input
 * - Duration threshold selector (default 6 minutes)
 * - Frequency options (daily, most days, etc.)
 * - Category picker (initially mindfulness only)
 */

import { ref, computed, watch } from "vue";

interface Props {
  isOpen: boolean;
  editRhythm?: {
    id: string;
    name: string;
    durationThresholdSeconds: number;
    countThreshold?: number | null;
    frequency: string;
    matchCategory: string | null;
    matchType: string | null;
  } | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "save",
    rhythm: {
      name: string;
      matchCategory: string;
      matchType: string;
      durationThresholdSeconds?: number;
      countThreshold?: number;
      frequency: string;
    },
  ): void;
  (
    e: "update",
    rhythm: {
      id: string;
      name: string;
      durationThresholdSeconds: number;
      frequency: string;
    },
  ): void;
}>();

// Form state
const name = ref("");
const entryType = ref<"timed" | "tally">("timed");
const durationMinutes = ref(6);
const customDuration = ref("");
const countValue = ref(10);
const customCount = ref("");
const category = ref("mindfulness");
const matchingScope = ref<"all" | "specific">("all");
const specificActivityName = ref("");
const saving = ref(false);
const error = ref<string | null>(null);

// Reset form when modal opens/closes
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      if (props.editRhythm) {
        // Edit mode
        name.value = props.editRhythm.name;
        entryType.value =
          (props.editRhythm.matchType as "timed" | "tally") || "timed";
        durationMinutes.value = Math.floor(
          props.editRhythm.durationThresholdSeconds / 60,
        );
        countValue.value = props.editRhythm.countThreshold || 10;
        category.value = props.editRhythm.matchCategory ?? "mindfulness";
        matchingScope.value = "all"; // Simplified for now
        specificActivityName.value = "";
      } else {
        // Create mode - reset to defaults
        name.value = "";
        entryType.value = "timed";
        durationMinutes.value = 6;
        customDuration.value = "";
        countValue.value = 10;
        customCount.value = "";
        category.value = "mindfulness";
        matchingScope.value = "all";
        specificActivityName.value = "";
      }
      error.value = null;
    }
  },
);

const isEditing = computed(() => !!props.editRhythm);

const modalTitle = computed(() =>
  isEditing.value ? "Edit Rhythm" : "New Rhythm",
);

// Entry type options
const entryTypeOptions = [
  {
    value: "timed",
    label: "Timed",
    icon: "⏱️",
  },
  {
    value: "tally",
    label: "Tally",
    icon: "🔢",
  },
];

// Category options (filtered by entry type)
const categoryOptions = computed(() => {
  const allCategories = [
    {
      value: "mindfulness",
      label: "Mindfulness",
      emoji: "🧘",
      allowedForTimed: true,
    },
    {
      value: "movement",
      label: "Movement",
      emoji: "🏃",
      allowedForTimed: true,
    },
    {
      value: "creative",
      label: "Creative",
      emoji: "🎨",
      allowedForTimed: true,
    },
    {
      value: "learning",
      label: "Learning",
      emoji: "📚",
      allowedForTimed: true,
    },
    { value: "health", label: "Health", emoji: "💚", allowedForTimed: false },
    { value: "work", label: "Work", emoji: "💼", allowedForTimed: false },
    {
      value: "life_admin",
      label: "Life Admin",
      emoji: "🏠",
      allowedForTimed: true,
    },
  ];

  // For timed rhythms, only show categories that support timed activities
  if (entryType.value === "timed") {
    return allCategories.filter((cat) => cat.allowedForTimed);
  }

  // For tally rhythms, show all categories
  return allCategories;
});

// Update category when switching entry type if current category is invalid
watch(entryType, (newType) => {
  const validCategories = categoryOptions.value.map((c) => c.value);
  if (!validCategories.includes(category.value)) {
    category.value = newType === "timed" ? "mindfulness" : "movement";
  }
});

// Frequency options with friendly labels
const frequencyOptions = [
  { value: "daily", label: "Daily", description: "Every day" },
  { value: "weekly", label: "Weekly", description: "Once a week" },
  { value: "monthly", label: "Monthly", description: "Once a month" },
];

// Duration presets
const durationPresets = [
  { value: 1, label: "1 min" },
  { value: 5, label: "5 min" },
  { value: 6, label: "6 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
];

// Count presets for tally rhythms
const countPresets = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 15, label: "15" },
  { value: 20, label: "20" },
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
];

// Get current threshold value (preset or custom)
const currentDuration = computed(() => {
  if (customDuration.value) {
    const parsed = parseInt(customDuration.value);
    return !isNaN(parsed) ? parsed : durationMinutes.value;
  }
  return durationMinutes.value;
});

const currentCount = computed(() => {
  if (customCount.value) {
    const parsed = parseInt(customCount.value);
    return !isNaN(parsed) ? parsed : countValue.value;
  }
  return countValue.value;
});

// Validation
const isValid = computed(() => {
  const hasName = name.value.trim().length > 0;
  const hasCategory = !!category.value;
  const hasSpecificName =
    matchingScope.value === "all" ||
    specificActivityName.value.trim().length > 0;

  if (entryType.value === "timed") {
    const duration = currentDuration.value;
    return (
      hasName &&
      hasCategory &&
      hasSpecificName &&
      duration >= 1 &&
      duration <= 1440
    );
  } else {
    const count = currentCount.value;
    return (
      hasName && hasCategory && hasSpecificName && count >= 1 && count <= 10000
    );
  }
});

function close() {
  emit("close");
}

async function save() {
  if (!isValid.value) return;

  saving.value = true;
  error.value = null;

  try {
    if (isEditing.value && props.editRhythm) {
      // Edit mode - emit update
      emit("update", {
        id: props.editRhythm.id,
        name: name.value.trim(),
        durationThresholdSeconds: currentDuration.value * 60,
        frequency: "daily",
      });
    } else {
      // Create mode - emit save with type-specific data
      const rhythmData: any = {
        name: name.value.trim(),
        matchCategory: category.value,
        matchType: entryType.value,
        frequency: "daily", // Always daily - all rhythms are graceful
      };

      // Add specific activity name if narrowing down
      if (
        matchingScope.value === "specific" &&
        specificActivityName.value.trim()
      ) {
        rhythmData.matchName = specificActivityName.value.trim();
      }

      if (entryType.value === "timed") {
        rhythmData.durationThresholdSeconds = currentDuration.value * 60;
      } else {
        rhythmData.countThreshold = currentCount.value;
      }

      emit("save", rhythmData);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to save rhythm";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="close" />

        <!-- Modal -->
        <div
          class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
        >
          <!-- Header -->
          <div class="mb-6 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ modalTitle }}
            </h2>
            <button
              type="button"
              class="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              @click="close"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Form -->
          <form class="space-y-6" @submit.prevent="save">
            <!-- Name -->
            <div>
              <label
                for="rhythm-name"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Name
              </label>
              <input
                id="rhythm-name"
                v-model="name"
                type="text"
                placeholder="Daily Meditation"
                class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                required
              />
            </div>

            <!-- Entry Type (only show for new rhythms) -->
            <div v-if="!isEditing">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Entry Type
              </label>
              <div class="flex gap-2">
                <button
                  v-for="option in entryTypeOptions"
                  :key="option.value"
                  type="button"
                  :class="[
                    'flex-1 flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors',
                    entryType === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500',
                  ]"
                  @click="entryType = option.value"
                >
                  <span>{{ option.icon }}</span>
                  <span>{{ option.label }}</span>
                </button>
              </div>
            </div>

            <!-- Category -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Category
              </label>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <button
                  v-for="option in categoryOptions"
                  :key="option.value"
                  type="button"
                  :class="[
                    'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                    category === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500',
                  ]"
                  @click="category = option.value"
                >
                  <span>{{ option.emoji }}</span>
                  <span>{{ option.label }}</span>
                </button>
              </div>
            </div>

            <!-- Matching Scope -->
            <div v-if="!isEditing">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                What to track
              </label>
              <div class="space-y-2">
                <label
                  :class="[
                    'flex items-center gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition-colors',
                    matchingScope === 'all'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500',
                  ]"
                >
                  <input
                    v-model="matchingScope"
                    type="radio"
                    value="all"
                    class="text-primary-500 focus:ring-primary-500"
                  />
                  <span class="text-sm text-gray-900 dark:text-white">
                    All
                    {{
                      categoryOptions.find((c) => c.value === category)
                        ?.label || "activities"
                    }}
                  </span>
                </label>
                <label
                  :class="[
                    'flex items-start gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition-colors',
                    matchingScope === 'specific'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500',
                  ]"
                >
                  <input
                    v-model="matchingScope"
                    type="radio"
                    value="specific"
                    class="mt-1 text-primary-500 focus:ring-primary-500"
                  />
                  <div class="flex-1">
                    <span
                      class="text-sm text-gray-900 dark:text-white block mb-2"
                    >
                      Only activities named:
                    </span>
                    <input
                      v-model="specificActivityName"
                      type="text"
                      :disabled="matchingScope !== 'specific'"
                      placeholder="e.g., kettlebell, piano, walking"
                      class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                    />
                  </div>
                </label>
              </div>
            </div>

            <!-- Duration Threshold (for timed rhythms) -->
            <div v-if="entryType === 'timed'">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Minimum duration per day
              </label>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Sessions shorter than this won't count toward your streak
              </p>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="preset in durationPresets"
                  :key="preset.value"
                  type="button"
                  :class="[
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    durationMinutes === preset.value && !customDuration
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                  ]"
                  @click="
                    durationMinutes = preset.value;
                    customDuration = '';
                  "
                >
                  {{ preset.label }}
                </button>
                <input
                  v-model="customDuration"
                  type="number"
                  min="1"
                  max="1440"
                  placeholder="Custom"
                  class="w-20 rounded-full border border-gray-300 px-3 py-2 text-sm text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <span
                  class="flex items-center text-sm text-gray-500 dark:text-gray-400"
                  >min</span
                >
              </div>
            </div>

            <!-- Count Threshold (for tally rhythms) -->
            <div v-if="entryType === 'tally'">
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Minimum count per day
              </label>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Days with fewer repetitions won't count toward your streak
              </p>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="preset in countPresets"
                  :key="preset.value"
                  type="button"
                  :class="[
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    countValue === preset.value && !customCount
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                  ]"
                  @click="
                    countValue = preset.value;
                    customCount = '';
                  "
                >
                  {{ preset.label }}
                </button>
                <input
                  v-model="customCount"
                  type="number"
                  min="1"
                  max="10000"
                  placeholder="Custom"
                  class="w-20 rounded-full border border-gray-300 px-3 py-2 text-sm text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <span
                  class="flex items-center text-sm text-gray-500 dark:text-gray-400"
                  >reps</span
                >
              </div>
            </div>

            <!-- Error message -->
            <div
              v-if="error"
              class="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
            >
              {{ error }}
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                @click="close"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!isValid || saving"
                :class="[
                  'flex-1 rounded-lg px-4 py-2.5 font-medium text-white transition-colors',
                  isValid && !saving
                    ? 'bg-primary-500 hover:bg-primary-600'
                    : 'cursor-not-allowed bg-gray-300 dark:bg-gray-600',
                ]"
              >
                {{
                  saving
                    ? "Saving..."
                    : isEditing
                      ? "Save Changes"
                      : "Create Rhythm"
                }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
