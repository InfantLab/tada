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
  tierApplied: string;
  dismissedAt: string | null;
}

const props = defineProps<{
  celebration: CelebrationData;
}>();

const emit = defineEmits<{
  dismissed: [];
}>();

const isDismissing = ref(false);

async function dismiss() {
  isDismissing.value = true;
  try {
    await $fetch(
      `/api/weekly-rhythms/messages/${props.celebration.id}/dismiss`,
      { method: "POST" },
    );
    emit("dismissed");
  } catch (err) {
    console.error("Failed to dismiss celebration:", err);
  } finally {
    isDismissing.value = false;
  }
}

const tierLabel = computed(() => {
  const labels: Record<string, string> = {
    stats_only: "Stats",
    private_ai: "Private AI",
    cloud_factual: "Cloud AI",
    cloud_creative: "Cloud AI",
  };
  return labels[props.celebration.tierApplied] ?? "Stats";
});

const isBasicTier = computed(() => props.celebration.tierApplied === "stats_only");
</script>

<template>
  <div
    class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden"
  >
    <!-- Header -->
    <div class="bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-900/20 dark:to-emerald-900/20 px-4 py-3 flex items-start justify-between">
      <h3 class="font-semibold text-sm text-stone-800 dark:text-stone-100 flex-1">
        {{ celebration.title }}
      </h3>
      <button
        class="ml-2 flex-shrink-0 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 transition-colors"
        :disabled="isDismissing"
        title="Dismiss"
        @click="dismiss"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
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

    <!-- Footer: tier badge + upgrade nudge -->
    <div class="px-4 pb-3 flex items-center justify-between">
      <span class="text-xs text-stone-400 dark:text-stone-500">
        {{ tierLabel }}
      </span>
      <NuxtLink
        v-if="isBasicTier"
        to="/settings#weekly-rhythms"
        class="text-xs text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 transition-colors"
      >
        Richer celebrations available →
      </NuxtLink>
    </div>
  </div>
</template>
