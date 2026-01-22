<script setup lang="ts">
/**
 * RhythmChainTabs - Tabbed view for all chain types
 *
 * Shows tabs for each chain type with calendar/histogram toggle
 * and chain-specific statistics within each tab.
 */

import {
  CHAIN_CONFIGS,
  formatChainValue,
  type ChainType,
  type ChainStat,
  type DayStatus,
} from "~/utils/tierCalculator";

interface Props {
  days: DayStatus[];
  chains: ChainStat[];
  thresholdSeconds: number;
  weeklyTargetMinutes?: number;
  monthlyTargetMinutes?: number;
  nudgeMessage?: string;
}

const props = defineProps<Props>();

// Active tab (chain type)
const activeTab = ref<ChainType>("weekly_low");

// Get chain stat for a specific type
function getChainForType(type: ChainType): ChainStat | undefined {
  return props.chains.find((c) => c.type === type);
}

// Get the active chain
const activeChain = computed(() => getChainForType(activeTab.value));

// Check if current equals or exceeds best
function isPersonalBest(chain: ChainStat): boolean {
  return chain.current > 0 && chain.current >= chain.longest;
}

// Get target info for the active chain type
const targetInfo = computed(() => {
  const dailyMinutes = Math.round(props.thresholdSeconds / 60);
  const config = CHAIN_CONFIGS.find((c) => c.type === activeTab.value);

  switch (activeTab.value) {
    case "daily":
      return {
        label: "Daily target",
        value: `${dailyMinutes} min/day`,
      };
    case "weekly_high":
      return {
        label: "Target",
        value: `${dailyMinutes}+ min on 5 days/week`,
      };
    case "weekly_low":
      return {
        label: "Target",
        value: `${dailyMinutes}+ min on ${config?.minDaysPerPeriod || 3} days/week`,
      };
    case "weekly_target":
      if (props.weeklyTargetMinutes) {
        return {
          label: "Weekly goal",
          value: `${props.weeklyTargetMinutes} min/week`,
        };
      }
      return {
        label: "Weekly goal",
        value: "Not set",
        isEditable: true,
      };
    case "monthly_target":
      if (props.monthlyTargetMinutes) {
        return {
          label: "Monthly goal",
          value: `${props.monthlyTargetMinutes} min/month`,
        };
      }
      return {
        label: "Monthly goal",
        value: "Not set",
        isEditable: true,
      };
    default:
      return null;
  }
});
</script>

<template>
  <div class="space-y-4">
    <!-- Tabs -->
    <div
      class="flex gap-1 overflow-x-auto border-b border-stone-200 dark:border-stone-700"
    >
      <button
        v-for="config in CHAIN_CONFIGS"
        :key="config.type"
        class="whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors"
        :class="[
          activeTab === config.type
            ? 'border-b-2 border-tada-500 text-tada-600 dark:text-tada-400'
            : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300',
        ]"
        @click="activeTab = config.type"
      >
        {{ config.shortLabel }}
      </button>
    </div>

    <!-- Chain stats for active tab -->
    <div
      v-if="activeChain"
      class="rounded-lg bg-tada-50 px-4 py-3 ring-1 ring-tada-200 dark:bg-tada-900/20 dark:ring-tada-700/30"
    >
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <span class="text-sm font-semibold text-tada-700 dark:text-tada-300">
            {{ CHAIN_CONFIGS.find((c) => c.type === activeTab)?.label }}
          </span>
          <span class="ml-1.5 text-xs text-tada-500 dark:text-tada-400">
            ({{ CHAIN_CONFIGS.find((c) => c.type === activeTab)?.description }})
          </span>
        </div>
        <span
          v-if="isPersonalBest(activeChain)"
          class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        >
          🏆 Best!
        </span>
      </div>

      <!-- Target info -->
      <div
        v-if="targetInfo"
        class="mt-2 flex items-center gap-2 text-xs text-tada-600 dark:text-tada-400"
      >
        <span class="font-medium">{{ targetInfo.label }}:</span>
        <span :class="{ 'italic text-stone-400': targetInfo.isEditable }">
          {{ targetInfo.value }}
        </span>
      </div>

      <!-- Current and Best -->
      <div class="mt-3 flex items-end justify-between">
        <div>
          <div class="text-xs text-tada-500 dark:text-tada-400">
            Current Chain
          </div>
          <div
            :class="[
              'text-2xl font-bold',
              activeChain.current > 0
                ? 'text-tada-700 dark:text-tada-200'
                : 'text-stone-300 dark:text-stone-600',
            ]"
          >
            {{ formatChainValue(activeChain.current, activeChain.unit) }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-stone-400 dark:text-stone-500">
            All-Time Best
          </div>
          <div class="text-lg font-semibold text-stone-600 dark:text-stone-300">
            {{ formatChainValue(activeChain.longest, activeChain.unit) }}
          </div>
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
