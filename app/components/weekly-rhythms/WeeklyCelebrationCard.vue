<script setup lang="ts">
interface CelebrationData {
  id: string;
  weekStartDate: string;
  title: string;
  summaryBlocks: Array<{
    section: string;
    heading: string;
    lines: string[];
  }>;
  narrativeText: string | null;
}

defineProps<{
  celebration: CelebrationData;
}>();
</script>

<template>
  <div
    class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden"
  >
    <!-- Header -->
    <div class="bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-900/20 dark:to-emerald-900/20 px-4 py-3">
      <h3 class="font-semibold text-sm text-stone-800 dark:text-stone-100">
        {{ celebration.title }}
      </h3>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-3">
      <!-- Narrative (if available from AI tiers) -->
      <p
        v-if="celebration.narrativeText"
        class="text-sm text-stone-700 dark:text-stone-300 italic leading-relaxed"
      >
        {{ celebration.narrativeText }}
      </p>

      <!-- Summary blocks -->
      <div
        v-for="block in celebration.summaryBlocks"
        :key="block.section"
      >
        <p class="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">
          {{ block.heading }}
        </p>
        <ul class="space-y-0.5">
          <li
            v-for="(line, i) in block.lines"
            :key="i"
            class="text-sm text-stone-700 dark:text-stone-300"
          >
            {{ line }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
