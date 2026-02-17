<script setup lang="ts">
/**
 * RhythmChainTabs - All chain types displayed simultaneously
 *
 * Shows every chain type in a compact grid. Active chains (current > 0)
 * are visually accented; inactive ones are dimmed. Personal bests are flagged.
 */

import {
  CHAIN_CONFIGS,
  formatChainValue,
  type ChainStat,
  type DayStatus,
} from "~/utils/tierCalculator";

interface Props {
  days: DayStatus[];
  chains: ChainStat[];
  goalType?: "duration" | "count";
  thresholdSeconds: number;
  thresholdCount?: number | null;
  weeklyTargetMinutes?: number;
  monthlyTargetMinutes?: number;
  nudgeMessage?: string;
}

const props = defineProps<Props>();

// Enrich chain stats with config metadata
const enrichedChains = computed(() =>
  CHAIN_CONFIGS.map((config) => {
    const stat = props.chains.find((c) => c.type === config.type);
    return {
      config,
      current: stat?.current ?? 0,
      longest: stat?.longest ?? 0,
      unit: stat?.unit ?? config.unit,
      isActive: (stat?.current ?? 0) > 0,
      isPersonalBest:
        (stat?.current ?? 0) > 0 && (stat?.current ?? 0) >= (stat?.longest ?? 0),
    };
  }),
);

// Split into active and inactive for rendering order
const activeChains = computed(() =>
  enrichedChains.value.filter((c) => c.isActive),
);
const inactiveChains = computed(() =>
  enrichedChains.value.filter((c) => !c.isActive),
);
</script>

<template>
  <div class="space-y-3">
    <h4 class="text-sm font-semibold text-stone-600 dark:text-stone-300">
      Chains
    </h4>

    <!-- Active chains — full accent -->
    <div v-if="activeChains.length > 0" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div
        v-for="chain in activeChains"
        :key="chain.config.type"
        class="rounded-lg bg-tada-50 px-3 py-2.5 ring-1 ring-tada-200 dark:bg-tada-900/20 dark:ring-tada-700/30"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-tada-600 dark:text-tada-400">
            {{ chain.config.shortLabel }}
          </span>
          <span
            v-if="chain.isPersonalBest"
            class="text-xs text-amber-600 dark:text-amber-400"
            title="Personal best!"
          >
            🏆
          </span>
        </div>
        <div class="mt-1 text-lg font-bold text-tada-700 dark:text-tada-200">
          🔗 {{ formatChainValue(chain.current, chain.unit) }}
        </div>
        <div class="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
          best: {{ formatChainValue(chain.longest, chain.unit) }}
        </div>
      </div>
    </div>

    <!-- Inactive chains — dimmed, compact -->
    <div
      v-if="inactiveChains.length > 0"
      class="grid grid-cols-2 gap-2 sm:grid-cols-3"
      :class="{ 'mt-1': activeChains.length > 0 }"
    >
      <div
        v-for="chain in inactiveChains"
        :key="chain.config.type"
        class="rounded-lg bg-stone-50 px-3 py-2 ring-1 ring-stone-200/50 dark:bg-stone-800/50 dark:ring-stone-700/30"
      >
        <span class="text-xs font-medium text-stone-400 dark:text-stone-500">
          {{ chain.config.shortLabel }}
        </span>
        <div class="mt-1 text-sm text-stone-300 dark:text-stone-600">
          —
        </div>
        <div
          v-if="chain.longest > 0"
          class="mt-0.5 text-xs text-stone-400 dark:text-stone-500"
        >
          best: {{ formatChainValue(chain.longest, chain.unit) }}
        </div>
      </div>
    </div>

    <!-- Nudge message -->
    <div
      v-if="nudgeMessage"
      class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
    >
      💡 {{ nudgeMessage }}
    </div>
  </div>
</template>
