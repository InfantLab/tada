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
  tierApplied: string;
  dismissedAt: string | null;
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

function handleEncouragementDismissed() {
  encouragement.value = null;
}

function handleCelebrationDismissed() {
  celebration.value = null;
}

onMounted(() => {
  fetchCurrent();
});
</script>

<template>
  <div v-if="!loading && (encouragement || celebration)" class="space-y-3">
    <WeeklyRhythmsEncouragementBanner
      v-if="encouragement && !encouragement.dismissedAt"
      :encouragement="encouragement"
      @dismissed="handleEncouragementDismissed"
    />
    <WeeklyRhythmsCelebrationCard
      v-if="celebration && !celebration.dismissedAt"
      :celebration="celebration"
      @dismissed="handleCelebrationDismissed"
    />
  </div>
</template>
