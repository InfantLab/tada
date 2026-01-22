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
    frequency: string;
    matchCategory: string | null;
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
      durationThresholdSeconds: number;
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
const durationMinutes = ref(6);
const frequency = ref("daily");
const category = ref("mindfulness");
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
        durationMinutes.value = Math.floor(
          props.editRhythm.durationThresholdSeconds / 60,
        );
        frequency.value = props.editRhythm.frequency;
        category.value = props.editRhythm.matchCategory ?? "mindfulness";
      } else {
        // Create mode - reset to defaults
        name.value = "";
        durationMinutes.value = 6;
        frequency.value = "daily";
        category.value = "mindfulness";
      }
      error.value = null;
    }
  },
);

const isEditing = computed(() => !!props.editRhythm);

const modalTitle = computed(() =>
  isEditing.value ? "Edit Rhythm" : "New Rhythm",
);

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

// Validation
const isValid = computed(() => {
  return (
    name.value.trim().length > 0 &&
    durationMinutes.value >= 1 &&
    durationMinutes.value <= 1440 &&
    frequency.value &&
    category.value
  );
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
        durationThresholdSeconds: durationMinutes.value * 60,
        frequency: frequency.value,
      });
    } else {
      // Create mode - emit save
      emit("save", {
        name: name.value.trim(),
        matchCategory: category.value,
        durationThresholdSeconds: durationMinutes.value * 60,
        frequency: frequency.value,
      });
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

            <!-- Duration Threshold -->
            <div>
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
                    durationMinutes === preset.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                  ]"
                  @click="durationMinutes = preset.value"
                >
                  {{ preset.label }}
                </button>
              </div>
            </div>

            <!-- Frequency -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Frequency
              </label>
              <div class="mt-2 space-y-2">
                <label
                  v-for="option in frequencyOptions"
                  :key="option.value"
                  :class="[
                    'flex cursor-pointer items-center rounded-lg border-2 p-3 transition-colors',
                    frequency === option.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500',
                  ]"
                >
                  <input
                    v-model="frequency"
                    type="radio"
                    :value="option.value"
                    class="sr-only"
                  />
                  <div class="flex-1">
                    <span class="font-medium text-gray-900 dark:text-white">
                      {{ option.label }}
                    </span>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ option.description }}
                    </p>
                  </div>
                  <div
                    v-if="frequency === option.value"
                    class="ml-3 text-primary-500"
                  >
                    <svg
                      class="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                </label>
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
