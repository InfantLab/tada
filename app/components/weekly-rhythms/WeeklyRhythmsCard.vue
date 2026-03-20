<script setup lang="ts">
/**
 * Shared weekly surface card wrapper.
 * Fetches current encouragement/celebration and displays appropriate components.
 */

interface SummaryBlock {
  section: string;
  heading: string;
  lines: string[];
}

interface EncouragementData {
  id: string;
  weekStartDate: string;
  title: string;
  summaryBlocks: SummaryBlock[];
  dismissedAt: string | null;
}

interface CelebrationData {
  id: string;
  weekStartDate: string;
  title: string;
  summaryBlocks: SummaryBlock[];
  narrativeText: string | null;
}

const encouragement = ref<EncouragementData | null>(null);
const celebration = ref<CelebrationData | null>(null);
const loading = ref(true);

async function fetchCurrent() {
  loading.value = true;
  try {
    const data = await $fetch<{
      encouragement: EncouragementData | null;
      celebration: CelebrationData | null;
    }>("/api/weekly-rhythms/current");
    encouragement.value = data.encouragement;
    celebration.value = data.celebration;
  } catch {
    // Silently fail — weekly rhythms are optional
  } finally {
    loading.value = false;
  }
}

function handleDismissed() {
  encouragement.value = null;
}

onMounted(() => {
  fetchCurrent();
});
</script>

<template>
  <div v-if="!loading && (encouragement || celebration)" class="space-y-3">
    <WeeklyEncouragementBanner
      v-if="encouragement && !encouragement.dismissedAt"
      :encouragement="encouragement"
      @dismissed="handleDismissed"
    />
    <WeeklyCelebrationCard
      v-if="celebration"
      :celebration="celebration"
    />
  </div>
</template>
