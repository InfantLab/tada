<script setup lang="ts">
/**
 * Rhythms page - See your natural patterns with graceful chains
 *
 * Displays rhythm panels with tier-based progress, visualizations,
 * and identity-based encouragement messaging.
 */
import type { EntryMode } from "~/components/EntryTypeToggle.vue";
import {
  useRhythms,
  type RhythmSummary,
  type RhythmProgress,
  type TypedChain,
} from "~/composables/useRhythms";
import { useToast } from "~/composables/useToast";
import {
  CHAIN_CONFIGS,
  CHAIN_TYPE_ORDER,
  formatChainValue,
  type ChainType,
} from "~/utils/tierCalculator";

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

// Onboarding state — show intro when user has no rhythms
const showOnboarding = ref(false);
const onboardingDismissed = ref(false);

// Fetch rhythms on mount
onMounted(async () => {
  try {
    await fetchRhythms();
    // Show onboarding if user has no rhythms
    if (rhythms.value.length === 0) {
      showOnboarding.value = true;
    }
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

// Seed demo rhythms for new users
async function seedDemoRhythms() {
  try {
    await $fetch("/api/rhythms/seed-defaults", { method: "POST" });
    showOnboarding.value = false;
    onboardingDismissed.value = true;
    await fetchRhythms();
    // Fetch progress for newly created rhythms
    for (const rhythm of rhythms.value) {
      if (!progressData.value.has(rhythm.id)) {
        fetchProgress(rhythm.id)
          .then((progress) => {
            progressData.value.set(rhythm.id, progress);
          })
          .catch(() => {});
      }
    }
    showToast("Created 3 demo rhythms — you can delete them anytime", "success");
  } catch (err) {
    console.error("Failed to seed demos:", err);
    showToast("Failed to create demo rhythms", "error");
  }
}

function dismissOnboarding() {
  showOnboarding.value = false;
  onboardingDismissed.value = true;
}

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
  matchType: string;
  durationThresholdSeconds?: number;
  countThreshold?: number;
  frequency: string;
}) {
  try {
    // Build the rhythm creation data based on type
    const createData: any = {
      ...rhythmData,
      goalType: rhythmData.matchType === "timed" ? "duration" : "count",
      goalValue:
        rhythmData.matchType === "timed"
          ? Math.floor((rhythmData.durationThresholdSeconds || 360) / 60)
          : rhythmData.countThreshold || 10,
      goalUnit: rhythmData.matchType === "timed" ? "minutes" : "reps",
    };

    await createRhythm(createData);
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

/**
 * Pick the most impressive active chain for the collapsed view.
 * Ranks by difficulty (daily > weekly_high > weekly_low > weekly_target > monthly_target).
 * Only considers chains with current > 0.
 */
function getBestActiveChain(rhythmId: string): TypedChain | null {
  const progress = getProgress(rhythmId);
  if (!progress?.chains) return null;

  const active = progress.chains.filter((c) => c.current > 0);
  if (active.length === 0) return null;

  // Sort by difficulty order (daily first = index 0 = hardest)
  active.sort((a, b) => {
    const aIdx = CHAIN_TYPE_ORDER.indexOf(a.type as ChainType);
    const bIdx = CHAIN_TYPE_ORDER.indexOf(b.type as ChainType);
    return aIdx - bIdx;
  });

  return active[0] ?? null;
}

/**
 * Days elapsed this week (Mon=1, Tue=2, ..., Sun=7).
 * Same for all rhythms — independent of completion status.
 */
const daysElapsedThisWeek = computed(() => {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return day === 0 ? 7 : day;
});

function journeyStageBadgeClass(stage: string): string {
  const classes: Record<string, string> = {
    beginning:
      "bg-emerald-100/40 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-300",
    building:
      "bg-teal-100/40 text-teal-700 dark:bg-teal-600/20 dark:text-teal-300",
    becoming:
      "bg-green-100/40 text-green-700 dark:bg-green-600/20 dark:text-green-300",
    being:
      "bg-amber-100/40 text-amber-700 dark:bg-amber-600/20 dark:text-amber-300",
  };
  return (
    classes[stage] ||
    "bg-stone-100/40 text-stone-600 dark:bg-stone-600/20 dark:text-stone-400"
  );
}

// Day popover state (for tapping heatmap cells)
interface PopoverEntry {
  id: string;
  name: string;
  type: string;
  durationSeconds: number | null;
  emoji: string | null;
}

const dayPopover = ref<{
  date: string;
  hasActivity: boolean;
  rhythmId: string;
  entries: PopoverEntry[];
  loadingEntries: boolean;
} | null>(null);

async function handleDayClick(date: string, hasActivity: boolean, rhythmId: string) {
  // Toggle popover: if tapping the same date, close it
  if (dayPopover.value?.date === date && dayPopover.value?.rhythmId === rhythmId) {
    dayPopover.value = null;
    return;
  }
  dayPopover.value = { date, hasActivity, rhythmId, entries: [], loadingEntries: hasActivity };

  // If there's activity, fetch the actual entries for this day
  if (hasActivity) {
    try {
      const rhythm = rhythms.value.find((r) => r.id === rhythmId);
      const params: Record<string, string> = { date };
      if (rhythm?.matchType) params.type = rhythm.matchType;
      if (rhythm?.matchCategory) params.category = rhythm.matchCategory;

      const result = await $fetch<{ data: PopoverEntry[] }>("/api/v1/entries", { params });
      if (dayPopover.value?.date === date && dayPopover.value?.rhythmId === rhythmId) {
        dayPopover.value.entries = result.data;
        dayPopover.value.loadingEntries = false;
      }
    } catch {
      if (dayPopover.value?.date === date && dayPopover.value?.rhythmId === rhythmId) {
        dayPopover.value.loadingEntries = false;
      }
    }
  }
}

function closeDayPopover() {
  dayPopover.value = null;
}

// Quick entry modal state (for adding entries from heatmap)
const showQuickEntry = ref(false);
const quickEntryMode = ref<EntryMode>("timed");
const quickEntryTimestamp = ref("");

function openAddEntry(rhythmId: string, date: string) {
  const rhythm = rhythms.value.find((r) => r.id === rhythmId);
  const modeMap: Record<string, EntryMode> = {
    timed: "timed",
    tally: "tally",
    moment: "moment",
    tada: "tada",
  };
  quickEntryMode.value = modeMap[rhythm?.matchType || ""] || "timed";
  // Set timestamp to noon on the selected date to avoid timezone issues
  quickEntryTimestamp.value = `${date}T12:00:00`;
  closeDayPopover();
  showQuickEntry.value = true;
}

function handleQuickEntrySaved() {
  showQuickEntry.value = false;
  // Refresh progress data for all expanded panels
  for (const rhythmId of expandedPanels.value) {
    fetchProgress(rhythmId)
      .then((progress) => {
        progressData.value.set(rhythmId, progress);
      })
      .catch(() => {});
  }
}

function formatEntryDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function formatPopoverDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00"); // Avoid timezone issues
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get gap dates for the daily chain of a rhythm
 */
function getDailyGaps(rhythmId: string): string[] {
  const progress = getProgress(rhythmId);
  if (!progress) return [];
  const dailyChain = progress.chains.find((c) => c.type === "daily");
  return dailyChain?.gaps ?? [];
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
        <div class="flex items-center gap-3">
          <p class="text-sm text-stone-500 dark:text-stone-400">
            See your natural patterns
          </p>
          <HelpLink search="chains" label="Need help?" />
        </div>
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

    <!-- Empty state with onboarding -->
    <div v-else-if="rhythms.length === 0">
      <OnboardingRhythmsOnboarding
        v-if="showOnboarding && !onboardingDismissed"
        :visible="showOnboarding"
        @seed-demos="seedDemoRhythms"
        @dismiss="dismissOnboarding"
      />
      <div v-if="!showOnboarding || onboardingDismissed" class="py-12 text-center">
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
                :class="journeyStageBadgeClass(rhythm.journeyStage)"
                class="rounded-full px-2 py-0.5 text-xs"
              >
                {{ rhythm.journeyStageEmoji }}
                {{ rhythm.journeyStageLabel }}
              </span>
              <span
                class="ml-auto text-xs text-stone-400 dark:text-stone-500"
              >
                <template v-if="rhythm.matchType === 'tally'">
                  {{ rhythm.countThreshold || '—' }} reps/day
                </template>
                <template v-else-if="rhythm.matchType === 'moment' || rhythm.matchType === 'tada'">
                  just show up
                </template>
                <template v-else>
                  {{ Math.floor(rhythm.durationThresholdSeconds / 60) }} min/day
                </template>
              </span>
            </div>

            <!-- Weekly status + streak -->
            <div
              class="flex flex-wrap items-center gap-2 text-sm text-stone-500 sm:gap-4 dark:text-stone-400"
            >
              <span class="flex items-center gap-1">
                This week: {{ rhythm.daysCompleted }} of
                {{ daysElapsedThisWeek }}
                {{ daysElapsedThisWeek === 1 ? "day" : "days" }}
              </span>
              <span
                v-if="getBestActiveChain(rhythm.id)"
                class="flex items-center gap-1"
              >
                🔗 {{ formatChainValue(getBestActiveChain(rhythm.id)!.current, getBestActiveChain(rhythm.id)!.unit) }}
                {{ getBestActiveChain(rhythm.id)!.label }} streak
              </span>
            </div>

            <!-- Bar chart (last 4 weeks) -->
            <div class="mt-3">
              <RhythmBarChart
                v-if="getProgress(rhythm.id)"
                :days="getProgress(rhythm.id)!.days"
                :goal-type="rhythm.matchType === 'timed' ? 'duration' : 'count'"
                :threshold-seconds="rhythm.durationThresholdSeconds"
                :threshold-count="rhythm.countThreshold"
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
            <div class="mb-6 relative">
              <RhythmYearTracker
                :days="getProgress(rhythm.id)!.days"
                :goal-type="rhythm.matchType === 'timed' ? 'duration' : 'count'"
                :threshold-seconds="rhythm.durationThresholdSeconds"
                :threshold-count="rhythm.countThreshold"
                @day-click="(date: string, hasActivity: boolean) => handleDayClick(date, hasActivity, rhythm.id)"
              />

              <!-- Day popover (shown when tapping a heatmap cell) -->
              <Transition name="fade">
                <div
                  v-if="dayPopover && dayPopover.rhythmId === rhythm.id"
                  class="mt-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-stone-600 dark:bg-stone-800"
                >
                  <!-- Header row -->
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-block h-2.5 w-2.5 rounded-sm"
                        :class="dayPopover.hasActivity ? 'bg-green-500' : 'bg-stone-300 dark:bg-stone-600'"
                      />
                      <span class="text-stone-700 dark:text-stone-200">
                        {{ formatPopoverDate(dayPopover.date) }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        class="rounded px-2 py-1 text-xs font-medium text-tada-600 hover:bg-tada-50 dark:text-tada-400 dark:hover:bg-tada-900/30"
                        @click="openAddEntry(rhythm.id, dayPopover.date)"
                      >
                        + Add entry
                      </button>
                      <button
                        class="rounded p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                        @click="closeDayPopover"
                      >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Entries list (for days with activity) -->
                  <div v-if="dayPopover.hasActivity" class="mt-2 border-t border-stone-100 pt-2 dark:border-stone-700">
                    <div v-if="dayPopover.loadingEntries" class="flex items-center gap-2 py-1 text-xs text-stone-400">
                      <div class="h-3 w-3 animate-spin rounded-full border border-stone-300 border-t-transparent" />
                      Loading entries...
                    </div>
                    <div v-else-if="dayPopover.entries.length === 0" class="py-1 text-xs text-stone-400">
                      No matching entries found
                    </div>
                    <div v-else class="space-y-1">
                      <NuxtLink
                        v-for="entry in dayPopover.entries"
                        :key="entry.id"
                        :to="`/entry/${entry.id}`"
                        class="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-stone-50 dark:hover:bg-stone-700/50"
                        @click="closeDayPopover"
                      >
                        <span v-if="entry.emoji" class="flex-shrink-0">{{ entry.emoji }}</span>
                        <span class="min-w-0 flex-1 truncate text-stone-700 dark:text-stone-200">
                          {{ entry.name }}
                        </span>
                        <span v-if="entry.durationSeconds" class="flex-shrink-0 text-stone-400">
                          {{ formatEntryDuration(entry.durationSeconds) }}
                        </span>
                      </NuxtLink>
                    </div>
                  </div>
                  <!-- No activity message -->
                  <div v-else class="mt-1 text-xs text-stone-400 dark:text-stone-500">
                    No activity
                  </div>
                </div>
              </Transition>

              <!-- Gap hints (subtle, shown only when daily chain has gaps) -->
              <div
                v-if="getDailyGaps(rhythm.id).length > 0"
                class="mt-2 text-xs text-stone-400 dark:text-stone-500"
              >
                <button
                  class="hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  @click="handleDayClick(getDailyGaps(rhythm.id)[0]!, false, rhythm.id)"
                >
                  {{ getDailyGaps(rhythm.id).length === 1 ? '1 gap' : `${getDailyGaps(rhythm.id).length} gaps` }}
                  in your daily chain — tap to see
                </button>
              </div>
            </div>

            <!-- Chain Tabs (with calendar/histogram views and stats) -->
            <RhythmChainTabs
              :days="getProgress(rhythm.id)!.days"
              :chains="getProgress(rhythm.id)!.chains"
              :goal-type="rhythm.matchType === 'timed' ? 'duration' : 'count'"
              :threshold-seconds="rhythm.durationThresholdSeconds"
              :threshold-count="rhythm.countThreshold"
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
              :match-type="rhythm.matchType"
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

    <!-- Quick Entry Modal (for adding entries from heatmap) -->
    <QuickEntryModal
      v-model:open="showQuickEntry"
      :initial-mode="quickEntryMode"
      :initial-timestamp="quickEntryTimestamp"
      @saved="handleQuickEntrySaved"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
