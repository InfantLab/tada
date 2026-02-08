/**
 * useRhythms - Composable for rhythm state management
 *
 * Provides reactive rhythm data with caching, fetching, and mutation helpers.
 */

import { ref, computed, type Ref } from "vue";
import type {
  TierName,
  DayStatus,
  ChainType,
  ChainUnit,
} from "~/utils/tierCalculator";

// ============================================================================
// Types
// ============================================================================

export interface RhythmSummary {
  id: string;
  name: string;
  emoji?: string | null;
  matchCategory: string | null;
  matchType: string | null;
  durationThresholdSeconds: number;
  countThreshold?: number | null;
  frequency: string;
  currentTier: TierName;
  currentTierLabel: string;
  currentChain: number;
  longestChain: number;
  chainUnit: ChainUnit;
  chainType: ChainType;
  chainLabel: string;
  chainTargetMinutes?: number | null;
  panelPreferences: {
    showYearTracker: boolean;
    showMonthCalendar: boolean;
    showChainStats: boolean;
    monthViewMode: "calendar" | "linear";
    expandedByDefault: boolean;
  };
  createdAt: string;
}

export interface TypedChain {
  type: ChainType;
  current: number;
  longest: number;
  unit: ChainUnit;
  label: string;
  description: string;
}

export interface RhythmProgress {
  rhythmId: string;
  primaryChainType: ChainType;
  chainTargetMinutes?: number | null;
  durationThresholdSeconds: number;
  currentWeek: {
    startDate: string;
    daysCompleted: number;
    achievedTier: TierName;
    bestPossibleTier: TierName;
    daysRemaining: number;
    nudgeMessage?: string;
  };
  chains: TypedChain[];
  days: DayStatus[];
  totals: {
    totalSessions: number;
    totalSeconds: number;
    totalHours: number;
    firstEntryDate: string | null;
    weeksActive: number;
    monthsActive: number;
  };
  journeyStage: "starting" | "building" | "becoming" | "being";
  encouragement: string;
}

export interface CreateRhythmInput {
  name: string;
  matchCategory: string;
  matchSubcategory?: string;
  matchType?: string;
  matchName?: string;
  durationThresholdSeconds?: number;
  countThreshold?: number;
  frequency: string;
  goalType?: string;
  goalValue?: number;
  goalUnit?: string;
}

export interface UpdateRhythmInput {
  name?: string;
  durationThresholdSeconds?: number;
  frequency?: string;
  panelPreferences?: RhythmSummary["panelPreferences"];
}

// ============================================================================
// State
// ============================================================================

const rhythms: Ref<RhythmSummary[]> = ref([]);
const progressCache: Ref<Map<string, RhythmProgress>> = ref(new Map());
const loading = ref(false);
const error: Ref<string | null> = ref(null);

// ============================================================================
// Composable
// ============================================================================

export function useRhythms() {
  /**
   * Fetch all rhythms for the current user
   */
  async function fetchRhythms(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch<{ rhythms: RhythmSummary[] }>(
        "/api/rhythms",
      );
      rhythms.value = response.rhythms;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch rhythms";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch progress data for a specific rhythm
   */
  async function fetchProgress(
    rhythmId: string,
    year?: number,
  ): Promise<RhythmProgress> {
    const cacheKey = `${rhythmId}-${year || "current"}`;

    try {
      const url = year
        ? `/api/rhythms/${rhythmId}/progress?year=${year}`
        : `/api/rhythms/${rhythmId}/progress`;

      const progress = await $fetch<RhythmProgress>(url);
      progressCache.value.set(cacheKey, progress);
      return progress;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch progress";
      throw err;
    }
  }

  /**
   * Create a new rhythm
   */
  async function createRhythm(
    input: CreateRhythmInput,
  ): Promise<RhythmSummary> {
    loading.value = true;
    error.value = null;

    try {
      const newRhythm = await $fetch<RhythmSummary>("/api/rhythms", {
        method: "POST",
        body: input,
      });

      // Add to local state with default tier info
      const rhythmWithDefaults: RhythmSummary = {
        ...newRhythm,
        currentTier: "starting",
        currentTierLabel: "Starting",
        currentChain: 0,
        longestChain: 0,
        chainUnit: "weeks",
        chainType: "weekly_low",
        chainLabel: "Weekly Low",
      };
      rhythms.value.push(rhythmWithDefaults);

      return rhythmWithDefaults;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to create rhythm";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update an existing rhythm
   */
  async function updateRhythm(
    id: string,
    input: UpdateRhythmInput,
  ): Promise<RhythmSummary> {
    loading.value = true;
    error.value = null;

    try {
      const updated = await $fetch<RhythmSummary>(`/api/rhythms/${id}`, {
        method: "PUT",
        body: input,
      });

      // Update local state
      const index = rhythms.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        rhythms.value[index] = { ...rhythms.value[index], ...updated };
        return rhythms.value[index] as RhythmSummary;
      }

      return updated;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update rhythm";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete a rhythm
   */
  async function deleteRhythm(id: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await $fetch<unknown>(`/api/rhythms/${id}`, { method: "delete" });

      // Remove from local state
      rhythms.value = rhythms.value.filter((r) => r.id !== id);
      progressCache.value.delete(id);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to delete rhythm";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get cached progress for a rhythm
   */
  function getCachedProgress(
    rhythmId: string,
    year?: number,
  ): RhythmProgress | undefined {
    const cacheKey = `${rhythmId}-${year || "current"}`;
    return progressCache.value.get(cacheKey);
  }

  /**
   * Clear progress cache (e.g., after creating an entry)
   */
  function invalidateProgressCache(rhythmId?: string): void {
    if (rhythmId) {
      // Clear all entries for this rhythm
      for (const key of progressCache.value.keys()) {
        if (key.startsWith(rhythmId)) {
          progressCache.value.delete(key);
        }
      }
    } else {
      progressCache.value.clear();
    }
  }

  // Computed helpers
  const hasRhythms = computed(() => rhythms.value.length > 0);
  const rhythmCount = computed(() => rhythms.value.length);

  return {
    // State
    rhythms,
    loading,
    error,

    // Computed
    hasRhythms,
    rhythmCount,

    // Actions
    fetchRhythms,
    fetchProgress,
    createRhythm,
    updateRhythm,
    deleteRhythm,
    getCachedProgress,
    invalidateProgressCache,
  };
}
