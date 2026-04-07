<script setup lang="ts">
/**
 * OurmojiDailyCard
 *
 * Displays today's Ourmoji: emoji, reflection, moon phase, and the
 * Wheel-of-Year context (if any). Used on the Ourmoji page and as the
 * Phase 3 placeholder input component for the `ourmoji` entry type.
 */

import type { OurmojiDailyCardDTO } from "~/types/ourmoji";

interface Props {
  entry: OurmojiDailyCardDTO | null;
  /** Optional title override (e.g. "Today" vs a date). */
  title?: string;
}

const props = defineProps<Props>();

const titleText = computed(() => props.title ?? "Today's Ourmoji");

const moonLine = computed(() => {
  if (!props.entry) return "";
  const phase = props.entry.moonPhase;
  const illum = props.entry.moonIllumination;
  if (illum != null) return `${phase} · ${Math.round(illum)}% illuminated`;
  return phase;
});
</script>

<template>
  <article
    class="rounded-2xl border border-purple-200/60 dark:border-purple-800/40 bg-gradient-to-br from-purple-50/60 to-indigo-50/60 dark:from-purple-950/30 dark:to-indigo-950/30 p-6 shadow-sm"
  >
    <header class="mb-3 flex items-start justify-between gap-3">
      <h2 class="text-sm font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
        {{ titleText }}
      </h2>
      <span v-if="entry" class="text-xs text-purple-600 dark:text-purple-400">
        {{ entry.date }}
      </span>
    </header>

    <div v-if="entry" class="space-y-4">
      <div class="flex items-start gap-4">
        <div class="text-6xl leading-none" :aria-label="`Today's emoji: ${entry.emoji}`">
          {{ entry.emoji }}
        </div>
        <p class="flex-1 text-base leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
          {{ entry.reflection }}
        </p>
      </div>

      <dl class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div class="flex items-center gap-1">
          <dt class="font-medium">🌙</dt>
          <dd>{{ moonLine }}</dd>
        </div>
        <div v-if="entry.wheelOfYear" class="flex items-center gap-1">
          <dt class="font-medium">🌀</dt>
          <dd>
            {{ entry.wheelOfYear }}
            <span
              v-if="entry.wheelCategory"
              class="ml-1 text-xs text-gray-500 dark:text-gray-500"
            >({{ entry.wheelCategory }})</span>
          </dd>
        </div>
      </dl>
    </div>

    <div v-else class="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
      No Ourmoji yet for today. Check back later.
    </div>
  </article>
</template>
