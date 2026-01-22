<script setup lang="ts">
/**
 * Rhythms page - See your natural patterns with graceful chains
 *
 * Displays rhythm panels with tier-based progress, visualizations,
 * and identity-based encouragement messaging.
 */
import {
  useRhythms,
  type RhythmSummary,
  type RhythmProgress,
} from "~/composables/useRhythms";
import { useToast } from "~/composables/useToast";

definePageMeta({
  layout: "default",
});

const { showToast } = useToast();

const {
  rhythms,
  loading,
  error,
  fetchRhythms,
  createRhythm,
  updateRhythm,
  deleteRhythm,
  fetchProgress,
} = useRhythms();

// Modal state
const showCreateModal = ref(false);
const editingRhythm = ref<RhythmSummary | null>(null);
const deletingRhythmId = ref<string | null>(null);

// Expanded panel state (by rhythm ID)
const expandedPanels = ref<Set<string>>(new Set());

// Progress data cache (by rhythm ID)
const progressData = ref<Map<string, RhythmProgress>>(new Map());

// Fetch rhythms on mount
onMounted(async () => {
  try {
    await fetchRhythms();
    // Fetch progress for all rhythms to show bar charts
    for (const rhythm of rhythms.value) {
      if (!progressData.value.has(rhythm.id)) {
        fetchProgress(rhythm.id)
          .then((progress) => {
            progressData.value.set(rhythm.id, progress);
          })
          .catch((err) => {
            console.error("Failed to fetch progress:", err);
          });
      }
    }
  } catch (err) {
    console.error("Failed to fetch rhythms:", err);
  }
});

// Toggle panel expansion and fetch progress if needed
async function togglePanel(rhythmId: string) {
  if (expandedPanels.value.has(rhythmId)) {
    expandedPanels.value.delete(rhythmId);
  } else {
    expandedPanels.value.add(rhythmId);
    // Fetch progress if not cached
    if (!progressData.value.has(rhythmId)) {
      try {
        const progress = await fetchProgress(rhythmId);
        progressData.value.set(rhythmId, progress);
      } catch (err) {
        console.error("Failed to fetch progress:", err);
      }
    }
  }
}

// Check if panel is expanded
function isPanelExpanded(rhythmId: string): boolean {
  return expandedPanels.value.has(rhythmId);
}

// Get progress for a rhythm
function getProgress(rhythmId: string): RhythmProgress | undefined {
  return progressData.value.get(rhythmId);
}

// Handle rhythm creation
async function handleCreateRhythm(rhythmData: {
  name: string;
  matchCategory: string;
  durationThresholdSeconds: number;
  frequency: string;
}) {
  try {
    await createRhythm({
      ...rhythmData,
      matchType: "timed",
      goalType: "duration",
      goalValue: Math.floor(rhythmData.durationThresholdSeconds / 60),
      goalUnit: "minutes",
    });
    showCreateModal.value = false;
    showToast("Rhythm created successfully", "success");
  } catch (err) {
    console.error("Failed to create rhythm:", err);
    showToast("Failed to create rhythm. Please try again.", "error");
  }
}

// Handle rhythm update
async function handleUpdateRhythm(rhythmData: {
  id: string;
  name: string;
  durationThresholdSeconds: number;
  frequency: string;
}) {
  try {
    await updateRhythm(rhythmData.id, {
      name: rhythmData.name,
      durationThresholdSeconds: rhythmData.durationThresholdSeconds,
      frequency: rhythmData.frequency,
    });
    showCreateModal.value = false;
    editingRhythm.value = null;
    showToast("Rhythm updated successfully", "success");
  } catch (err) {
    console.error("Failed to update rhythm:", err);
    showToast("Failed to update rhythm. Please try again.", "error");
  }
}

// Open edit modal
function openEditModal(rhythm: RhythmSummary) {
  editingRhythm.value = rhythm;
  showCreateModal.value = true;
}

// Handle delete confirmation
async function confirmDelete(rhythmId: string) {
  deletingRhythmId.value = rhythmId;
}

// Perform delete
async function handleDelete() {
  if (!deletingRhythmId.value) return;

  try {
    await deleteRhythm(deletingRhythmId.value);
    deletingRhythmId.value = null;
    showToast("Rhythm deleted", "success");
  } catch (err) {
    console.error("Failed to delete rhythm:", err);
    showToast("Failed to delete rhythm. Please try again.", "error");
  }
}

// Cancel delete
function cancelDelete() {
  deletingRhythmId.value = null;
}

// Get emoji for category
function getCategoryEmoji(category: string | null): string {
  const emojis: Record<string, string> = {
    mindfulness: "🧘",
    movement: "🏃",
    creative: "🎨",
    learning: "📚",
    health: "❤️",
  };
  return emojis[category || ""] || "✨";
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
          Rhythms
        </h1>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          See your natural patterns
        </p>
      </div>

      <!-- Add rhythm button -->
      <button
        class="flex items-center gap-2 rounded-lg bg-tada-600 px-4 py-2 font-medium text-black shadow-sm transition-colors hover:opacity-90 dark:bg-tada-600 dark:text-white"
        @click="showCreateModal = true"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span class="hidden sm:inline">New Rhythm</span>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div
        class="h-8 w-8 animate-spin rounded-full border-2 border-tada-300 border-t-transparent dark:border-tada-600"
      />
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20"
    >
      <p class="text-red-600 dark:text-red-400">{{ error }}</p>
      <button
        class="mt-2 text-sm text-red-500 underline hover:no-underline"
        @click="fetchRhythms"
      >
        Try again
      </button>
    </div>

    <!-- Empty state -->
    <div v-else-if="rhythms.length === 0" class="py-12 text-center">
      <div class="mb-4 text-6xl">🌊</div>
      <h2 class="mb-2 text-xl font-semibold text-stone-700 dark:text-stone-200">
        No rhythms yet
      </h2>
      <p class="mx-auto mb-6 max-w-md text-stone-500 dark:text-stone-400">
        Create rhythms to discover your natural patterns. Your practice will
        reveal itself over time.
      </p>
      <button
        class="inline-flex items-center gap-2 rounded-lg bg-tada-600 px-4 py-2 font-medium text-black transition-colors hover:opacity-90 dark:bg-tada-600 dark:text-white"
        @click="showCreateModal = true"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        Create your first rhythm
      </button>
    </div>

    <!-- Rhythms list -->
    <div v-else class="space-y-4">
      <div
        v-for="rhythm in rhythms"
        :key="rhythm.id"
        class="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800"
      >
        <!-- Collapsed header - clickable to expand -->
        <div
          class="flex cursor-pointer items-start gap-4 p-4"
          @click="togglePanel(rhythm.id)"
        >
          <!-- Emoji -->
          <div
            class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 text-2xl dark:bg-stone-700"
          >
            {{ getCategoryEmoji(rhythm.matchCategory) }}
          </div>

          <!-- Rhythm info -->
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center gap-2">
              <h3 class="font-medium text-stone-800 dark:text-stone-100">
                {{ rhythm.name }}
              </h3>
              <span
                class="rounded-full bg-tada-100/30 px-2 py-0.5 text-xs text-tada-700 dark:bg-tada-600/20 dark:text-tada-300"
              >
                {{ rhythm.currentTierLabel }}
              </span>
            </div>

            <!-- Chain info -->
            <div
              class="flex flex-wrap items-center gap-2 text-sm text-stone-500 sm:gap-4 dark:text-stone-400"
            >
              <span class="flex items-center gap-1">
                🔥 {{ rhythm.currentChain }} {{ rhythm.chainUnit }} streak
              </span>
              <span
                class="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500"
              >
                ({{ rhythm.chainLabel }})
              </span>
              <span class="flex items-center gap-1">
                ⏱️ {{ Math.floor(rhythm.durationThresholdSeconds / 60) }} min
                threshold
              </span>
            </div>

            <!-- Bar chart (last 4 weeks) -->
            <div class="mt-3">
              <RhythmBarChart
                v-if="getProgress(rhythm.id)"
                :days="getProgress(rhythm.id)!.days"
                :goal-type="'duration'"
                :threshold-seconds="rhythm.durationThresholdSeconds"
              />
              <div
                v-else
                class="flex h-[60px] items-center justify-center text-xs text-stone-400"
              >
                Loading activity...
              </div>
            </div>
          </div>

          <!-- Expand/Collapse indicator -->
          <div class="flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-stone-400 transition-transform dark:text-stone-500"
              :class="{ 'rotate-180': isPanelExpanded(rhythm.id) }"
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
          </div>
        </div>

        <!-- Expanded panel with chain tabs and encouragement -->
        <div
          v-if="isPanelExpanded(rhythm.id)"
          class="border-t border-stone-200 p-4 dark:border-stone-700"
        >
          <template v-if="getProgress(rhythm.id)">
            <!-- Year Tracker at top -->
            <div class="mb-6">
              <RhythmYearTracker
                :days="getProgress(rhythm.id)!.days"
                :threshold-seconds="rhythm.durationThresholdSeconds"
              />
            </div>

            <!-- Chain Tabs (with calendar/histogram views and stats) -->
            <RhythmChainTabs
              :days="getProgress(rhythm.id)!.days"
              :chains="getProgress(rhythm.id)!.chains"
              :threshold-seconds="rhythm.durationThresholdSeconds"
              :weekly-target-minutes="
                getProgress(rhythm.id)!.primaryChainType === 'weekly_target'
                  ? (getProgress(rhythm.id)!.chainTargetMinutes ?? undefined)
                  : undefined
              "
              :monthly-target-minutes="
                getProgress(rhythm.id)!.primaryChainType === 'monthly_target'
                  ? (getProgress(rhythm.id)!.chainTargetMinutes ?? undefined)
                  : undefined
              "
              :nudge-message="getProgress(rhythm.id)!.currentWeek.nudgeMessage"
              class="mb-6"
            />

            <!-- Encouragement and Totals -->
            <RhythmEncouragement
              :encouragement="getProgress(rhythm.id)!.encouragement"
              :journey-stage="getProgress(rhythm.id)!.journeyStage"
              :totals="getProgress(rhythm.id)!.totals"
            />

            <!-- Action buttons -->
            <div
              class="mt-4 flex items-center justify-end gap-3 border-t border-stone-200 pt-4 dark:border-stone-700"
            >
              <button
                class="min-h-[44px] min-w-[44px] rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-700"
                @click.stop="openEditModal(rhythm)"
              >
                Edit
              </button>
              <button
                class="min-h-[44px] min-w-[44px] rounded-lg px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                @click.stop="confirmDelete(rhythm.id)"
              >
                Delete
              </button>
            </div>
          </template>
          <div v-else class="flex items-center justify-center py-4">
            <div
              class="h-6 w-6 animate-spin rounded-full border-2 border-tada-300 border-t-transparent dark:border-tada-600"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <RhythmCreateModal
      :is-open="showCreateModal"
      :edit-rhythm="editingRhythm"
      @close="
        showCreateModal = false;
        editingRhythm = null;
      "
      @save="handleCreateRhythm"
      @update="handleUpdateRhythm"
    />

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="deletingRhythmId"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="cancelDelete"
      >
        <div
          class="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-stone-800"
        >
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Delete Rhythm?
          </h3>
          <p class="mt-2 text-sm text-stone-600 dark:text-stone-400">
            This will permanently delete this rhythm and all its tracking data.
            This action cannot be undone.
          </p>
          <div class="mt-6 flex justify-end gap-3">
            <button
              class="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-700"
              @click="cancelDelete"
            >
              Cancel
            </button>
            <button
              class="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              @click="handleDelete"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
