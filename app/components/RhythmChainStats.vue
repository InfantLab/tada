<script setup lang="ts">
/**
 * RhythmChainStats - Display chain statistics for each tier
 *
 * Shows current and longest chains, ordered by tier (Daily first).
 * Current chain is prominent, longest is subtle.
 */

import { computed } from "vue";
import type { TierName } from "~/utils/tierCalculator";
import { getTierLabel, TIER_ORDER } from "~/utils/tierCalculator";

interface ChainStat {
  tier: TierName;
  current: number;
  longest: number;
}

interface Props {
  chains: ChainStat[];
  achievedTier: TierName;
  nudgeMessage?: string;
}

const props = defineProps<Props>();

// Sort chains by tier order and filter out "starting"
const sortedChains = computed(() => {
  return props.chains
    .filter((c) => c.tier !== "starting")
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
});

// Get tier label
function getTierDisplayLabel(tier: TierName): string {
  return getTierLabel(tier);
}

// Check if this tier is the currently achieved tier
function isAchievedTier(tier: TierName): boolean {
  return tier === props.achievedTier;
}

// Format chain duration
function formatChain(weeks: number, tier: TierName): string {
  if (weeks === 0) return "—";
  if (tier === "daily") {
    // For daily tier, show as days
    return `${weeks * 7} days`;
  }
  return weeks === 1 ? "1 week" : `${weeks} weeks`;
}
</script>

<template>
  <div class="space-y-3">
    <!-- Nudge message -->
    <div
      v-if="nudgeMessage"
      class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
    >
      💡 {{ nudgeMessage }}
    </div>

    <!-- Chain stats by tier -->
    <div class="grid gap-2 sm:grid-cols-2">
      <div
        v-for="chain in sortedChains"
        :key="chain.tier"
        :class="[
          'rounded-lg px-3 py-2 transition-colors',
          isAchievedTier(chain.tier)
            ? 'bg-tada-100/30 ring-1 ring-tada-500/30 dark:bg-tada-600/20'
            : 'bg-stone-50 dark:bg-stone-700/50',
        ]"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span
              v-if="isAchievedTier(chain.tier)"
              class="text-tada-600 dark:text-tada-400"
            >
              ✓
            </span>
            <span
              :class="[
                'text-sm font-medium',
                isAchievedTier(chain.tier)
                  ? 'text-tada-700 dark:text-tada-300'
                  : 'text-stone-600 dark:text-stone-400',
              ]"
            >
              {{ getTierDisplayLabel(chain.tier) }}
            </span>
          </div>
        </div>

        <div class="mt-1 flex items-baseline gap-3">
          <!-- Current chain (prominent) -->
          <div class="flex items-baseline gap-1">
            <span
              :class="[
                'text-lg font-semibold',
                chain.current > 0
                  ? 'text-stone-800 dark:text-stone-100'
                  : 'text-stone-400 dark:text-stone-500',
              ]"
            >
              {{ chain.current > 0 ? chain.current : "—" }}
            </span>
            <span
              v-if="chain.current > 0"
              class="text-xs text-stone-500 dark:text-stone-400"
            >
              {{ chain.current === 1 ? "week" : "weeks" }}
            </span>
          </div>

          <!-- Longest chain (subtle) -->
          <div
            v-if="chain.longest > 0"
            class="text-xs text-stone-400 dark:text-stone-500"
          >
            best: {{ chain.longest }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
