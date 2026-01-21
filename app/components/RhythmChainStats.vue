<script setup lang="ts">
/**
 * RhythmChainStats - Display chain statistics
 *
 * Shows the chain stat based on rhythm's configured chain type.
 *
 * Chain types:
 * - daily: Consecutive days - counted in days
 * - weekly_high: 5+ days per week - counted in weeks
 * - weekly_low: 3+ days per week - counted in weeks
 * - weekly_target: Cumulative minutes per week - counted in weeks
 * - monthly_target: Cumulative minutes per month - counted in months
 */

import type { ChainType, ChainUnit } from "~/utils/tierCalculator";
import { formatChainValue } from "~/utils/tierCalculator";

interface TypedChain {
  type: ChainType;
  current: number;
  longest: number;
  unit: ChainUnit;
  label: string;
  description: string;
}

interface Props {
  chain: TypedChain;
  nudgeMessage?: string;
}

const props = defineProps<Props>();

// Check if current chain equals or exceeds best (personal record)
function isPersonalBest(): boolean {
  return props.chain.current > 0 && props.chain.current >= props.chain.longest;
}

// Format value based on unit
function formatValue(value: number): string {
  return formatChainValue(value, props.chain.unit);
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

    <!-- Primary chain stat -->
    <div
      class="rounded-lg bg-tada-50 px-4 py-3 ring-1 ring-tada-200 dark:bg-tada-900/20 dark:ring-tada-700/30"
    >
      <!-- Chain type header -->
      <div class="flex items-center justify-between">
        <div>
          <span class="text-sm font-semibold text-tada-700 dark:text-tada-300">
            {{ chain.label }}
          </span>
          <span class="ml-1.5 text-xs text-tada-500 dark:text-tada-400">
            ({{ chain.description }})
          </span>
        </div>
        <!-- Personal best badge -->
        <span
          v-if="isPersonalBest()"
          class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        >
          🏆 Best!
        </span>
      </div>

      <!-- Current and Best display -->
      <div class="mt-3 flex items-end justify-between">
        <!-- Current chain -->
        <div>
          <div class="text-xs text-tada-500 dark:text-tada-400">Current</div>
          <div
            :class="[
              'text-2xl font-bold',
              chain.current > 0
                ? 'text-tada-700 dark:text-tada-200'
                : 'text-stone-300 dark:text-stone-600',
            ]"
          >
            {{ formatValue(chain.current) }}
          </div>
        </div>

        <!-- Best chain -->
        <div class="text-right">
          <div class="text-xs text-stone-400 dark:text-stone-500">
            All-Time Best
          </div>
          <div
            :class="[
              'text-xl font-semibold',
              chain.longest > 0
                ? 'text-stone-600 dark:text-stone-300'
                : 'text-stone-300 dark:text-stone-600',
            ]"
          >
            {{ formatValue(chain.longest) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
