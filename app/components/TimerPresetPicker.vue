<script setup lang="ts">
/**
 * TimerPresetPicker - Component for selecting and managing timer presets
 */
import type { TimerPreset } from "~/server/db/schema";

const props = defineProps<{
  modelValue?: string | null; // Selected preset ID
}>();

const emit = defineEmits<{
  (e: "update:modelValue", id: string | null): void;
  (e: "select", preset: TimerPreset): void;
}>();

const { error: showError, success: showSuccess } = useToast();

// Fetch presets
const presets = ref<TimerPreset[]>([]);
const isLoading = ref(true);
const showSaveModal = ref(false);
const newPresetName = ref("");
const isSaving = ref(false);

// Preset data to save (passed from parent)
const presetDataToSave = ref<Partial<TimerPreset> | null>(null);

async function loadPresets() {
  isLoading.value = true;
  try {
    const data = await $fetch<TimerPreset[]>("/api/presets");
    presets.value = data;
  } catch {
    showError("Failed to load presets");
  } finally {
    isLoading.value = false;
  }
}

function selectPreset(preset: TimerPreset) {
  emit("update:modelValue", preset.id);
  emit("select", preset);
}

function deselectPreset() {
  emit("update:modelValue", null);
}

// Called by parent to open save dialog with preset data
function openSaveDialog(data: Partial<TimerPreset>) {
  presetDataToSave.value = data;
  newPresetName.value = "";
  showSaveModal.value = true;
}

// Find existing preset with same name (case-insensitive)
function findExistingPreset(name: string): TimerPreset | undefined {
  const trimmedLower = name.trim().toLowerCase();
  return presets.value.find((p) => p.name.toLowerCase() === trimmedLower);
}

async function savePreset() {
  if (!newPresetName.value.trim() || !presetDataToSave.value) return;

  // Check for existing preset with same name
  const existing = findExistingPreset(newPresetName.value);
  if (existing) {
    const confirmed = confirm(
      `A preset named "${existing.name}" already exists. Replace it with the new settings?`,
    );
    if (!confirmed) return;

    // Update existing preset
    isSaving.value = true;
    try {
      const updated = await $fetch<TimerPreset>(`/api/presets/${existing.id}`, {
        method: "PUT",
        body: {
          name: newPresetName.value.trim(),
          ...presetDataToSave.value,
        },
      });
      // Replace in local state
      const idx = presets.value.findIndex((p) => p.id === existing.id);
      if (idx !== -1) presets.value[idx] = updated;
      showSuccess("Preset updated!");
      showSaveModal.value = false;
      presetDataToSave.value = null;
    } catch {
      showError("Failed to update preset");
    } finally {
      isSaving.value = false;
    }
    return;
  }

  isSaving.value = true;
  try {
    const preset = await $fetch<TimerPreset>("/api/presets", {
      method: "POST",
      body: {
        name: newPresetName.value.trim(),
        ...presetDataToSave.value,
      },
    });
    presets.value.push(preset);
    showSuccess("Preset saved!");
    showSaveModal.value = false;
    presetDataToSave.value = null;
  } catch {
    showError("Failed to save preset");
  } finally {
    isSaving.value = false;
  }
}

async function deletePreset(preset: TimerPreset, event: Event) {
  event.stopPropagation();

  if (!confirm(`Delete "${preset.name}" preset?`)) return;

  try {
    await $fetch<unknown>(`/api/presets/${preset.id}`, { method: "DELETE" });
    presets.value = presets.value.filter((p) => p.id !== preset.id);
    if (props.modelValue === preset.id) {
      deselectPreset();
    }
    showSuccess("Preset deleted");
  } catch {
    showError("Failed to delete preset");
  }
}

// Get interval info for preset summary display
function getIntervalInfo(preset: TimerPreset): string {
  const bells = preset.bellConfig?.intervalBells;
  if (!bells || bells.length === 0) return "";

  // Get the first interval's duration
  const firstInterval = bells[0];
  if (!firstInterval || !firstInterval.minutes) return "";

  return `${firstInterval.minutes}m bells`;
}

// Expose methods to parent
defineExpose({
  openSaveDialog,
  loadPresets,
});

// Load presets on mount
onMounted(loadPresets);
</script>

<template>
  <div class="timer-preset-picker">
    <!-- Preset list -->
    <div v-if="isLoading" class="text-center py-4 text-stone-500">
      Loading presets...
    </div>

    <div
      v-else-if="presets.length === 0"
      class="text-center py-4 text-stone-500"
    >
      <p class="mb-2">No saved presets yet</p>
      <p class="text-sm">
        Save your current timer configuration as a preset for quick access
      </p>
    </div>

    <div v-else class="space-y-2">
      <button
        v-for="preset in presets"
        :key="preset.id"
        class="w-full flex items-center justify-between p-3 rounded-lg border transition-all"
        :class="
          modelValue === preset.id
            ? 'bg-tada-100 dark:bg-tada-900/30 border-tada-300 dark:border-tada-700'
            : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:border-tada-300 dark:hover:border-tada-600'
        "
        @click="selectPreset(preset)"
      >
        <div class="flex items-center gap-3">
          <span class="text-xl">⏱️</span>
          <div class="text-left">
            <div class="font-medium text-stone-800 dark:text-stone-100">
              {{ preset.name }}
            </div>
            <div class="text-sm text-stone-500 dark:text-stone-400">
              {{ preset.category }} / {{ preset.subcategory }}
              <span v-if="preset.durationSeconds">
                • {{ Math.floor(preset.durationSeconds / 60) }} min
              </span>
              <span v-else> • Unlimited</span>
              <span v-if="getIntervalInfo(preset)">
                • {{ getIntervalInfo(preset) }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span
            v-if="modelValue === preset.id"
            class="text-tada-600 dark:text-tada-400"
          >
            ✓
          </span>
          <button
            class="p-1 text-stone-400 hover:text-red-500 transition-colors"
            title="Delete preset"
            @click="deletePreset(preset, $event)"
          >
            <svg
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </button>

      <!-- Deselect button when a preset is selected -->
      <button
        v-if="modelValue"
        class="w-full py-2 text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
        @click="deselectPreset"
      >
        Clear selection
      </button>
    </div>

    <!-- Save Preset Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showSaveModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          @click.self="showSaveModal = false"
        >
          <div
            class="bg-white dark:bg-stone-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
          >
            <h3
              class="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-100"
            >
              Save as Preset
            </h3>

            <input
              v-model="newPresetName"
              type="text"
              placeholder="Preset name"
              class="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-tada-500 focus:border-transparent mb-4"
              @keyup.enter="savePreset"
            />

            <div class="flex justify-end gap-3">
              <button
                class="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg"
                @click="showSaveModal = false"
              >
                Cancel
              </button>
              <button
                class="px-4 py-2 bg-tada-500 hover:bg-tada-600 text-white rounded-lg font-medium disabled:opacity-50"
                :disabled="!newPresetName.trim() || isSaving"
                @click="savePreset"
              >
                {{ isSaving ? "Saving..." : "Save" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
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
</style>
