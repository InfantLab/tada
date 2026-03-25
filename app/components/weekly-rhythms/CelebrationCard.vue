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
    cloud_creative: "Cloud AI Creative",
  };
  return labels[props.celebration.tierApplied] ?? "Stats";
});

const upgradeNudge = computed(() => {
  if (props.celebration.tierApplied === "stats_only") {
    return "Richer celebrations available \u2192";
  }
  if (props.celebration.tierApplied === "cloud_factual") {
    return "Try creative mode for more personality \u2192";
  }
  return null;
});

const sectionIcon = (section: string) => {
  if (section === "general_progress") return "\u2728";
  if (section === "rhythm_wins") return "\uD83D\uDD25";
  return "\u2B50";
};
</script>

<template>
  <div
    class="bg-gradient-to-br from-amber-50 via-white to-emerald-50 dark:from-amber-900/10 dark:via-stone-800 dark:to-emerald-900/10 border border-amber-200/60 dark:border-amber-700/30 rounded-xl overflow-hidden shadow-sm"
  >
    <!-- Header -->
    <div class="bg-gradient-to-r from-amber-100/80 to-emerald-100/80 dark:from-amber-900/30 dark:to-emerald-900/30 px-4 py-3 flex items-start justify-between">
      <h3 class="font-semibold text-stone-800 dark:text-stone-100 flex-1">
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
    <div class="p-4 space-y-4">
      <!-- Narrative (if available from AI tiers) -->
      <p
        v-if="celebration.narrativeText"
        class="text-sm text-stone-700 dark:text-stone-300 italic leading-relaxed border-l-2 border-amber-300 dark:border-amber-600 pl-3"
      >
        {{ celebration.narrativeText }}
      </p>

      <!-- Summary blocks -->
      <div
        v-for="block in celebration.summaryBlocks"
        :key="block.section"
        class="space-y-1.5"
      >
        <p class="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide flex items-center gap-1.5">
          <span>{{ sectionIcon(block.section) }}</span>
          {{ block.heading }}
        </p>
        <ul class="space-y-1 pl-1">
          <li
            v-for="(line, i) in block.lines"
            :key="i"
            class="text-sm text-stone-700 dark:text-stone-300 flex items-start gap-2"
          >
            <span class="text-amber-400 dark:text-amber-500 mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-current" />
            <span>{{ line }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Footer: tier badge + upgrade nudge -->
    <div class="px-4 pb-3 pt-1 flex items-center justify-between border-t border-amber-100/50 dark:border-stone-700/50">
      <span class="text-xs text-stone-400 dark:text-stone-500">
        {{ tierLabel }}
      </span>
      <NuxtLink
        v-if="upgradeNudge"
        to="/settings#weekly-rhythms"
        class="text-xs text-amber-600/70 hover:text-amber-700 dark:text-amber-400/70 dark:hover:text-amber-300 transition-colors"
      >
        {{ upgradeNudge }}
      </NuxtLink>
    </div>
  </div>
</template>
