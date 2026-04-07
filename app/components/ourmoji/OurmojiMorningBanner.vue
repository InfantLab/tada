<script setup lang="ts">
/**
 * OurmojiMorningBanner (US3, T069)
 *
 * Self-contained banner mounted on the main timeline. On mount it
 * checks for an active Ourmoji experiment with an open morning prompt
 * for the current user. Renders nothing unless there's something to
 * action — so it's safe to mount unconditionally.
 *
 * Clicking the banner opens the inline flow. Visibility is gated by
 * the per-user Ourmoji feature flag (server returns 404 → silent).
 */

import DreamExperimentFlow from "./DreamExperimentFlow.vue";

interface ExperimentRun {
  id: string;
  status: string;
}

const activeRunId = ref<string | null>(null);
const expanded = ref(false);
const checking = ref(true);

async function discover() {
  checking.value = true;
  try {
    const res = await $fetch<{ runs: ExperimentRun[] }>(
      "/api/ourmoji/experiments",
    );
    const active = res.runs.find((r) => r.status === "active");
    if (!active) {
      activeRunId.value = null;
      return;
    }
    // Check if there's an open prompt — if not, don't render the banner.
    const prompt = await $fetch<{ prompt: { state: string } | null }>(
      `/api/ourmoji/experiments/${active.id}/morning-prompt`,
    );
    if (prompt.prompt && prompt.prompt.state !== "complete") {
      activeRunId.value = active.id;
    }
  } catch {
    // Module disabled or any error → render nothing.
    activeRunId.value = null;
  } finally {
    checking.value = false;
  }
}

onMounted(() => {
  void discover();
});
</script>

<template>
  <div v-if="!checking && activeRunId" class="mb-4">
    <button
      v-if="!expanded"
      type="button"
      class="w-full rounded-xl border border-purple-300 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-4 text-left hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/40"
      @click="expanded = true"
    >
      <div class="flex items-center justify-between">
        <div>
          <div class="font-semibold text-purple-800 dark:text-purple-200">
            🌙 Your Ourmoji morning is ready
          </div>
          <div class="text-sm text-purple-700 dark:text-purple-300">
            Record your dream and make your guess.
          </div>
        </div>
        <span class="text-purple-600 dark:text-purple-300">→</span>
      </div>
    </button>

    <div
      v-else
      class="rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 p-6"
    >
      <DreamExperimentFlow :experiment-id="activeRunId" />
    </div>
  </div>
</template>
