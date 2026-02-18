<script setup lang="ts">
/**
 * RhythmsOnboarding - Gentle intro overlay for the Rhythms page
 *
 * Shown on first visit when the user has no rhythms. Explains the three
 * rhythm types and offers to create demo rhythms. Dismissible.
 */

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  dismiss: [];
  "seed-demos": [];
}>();

const seeding = ref(false);

async function handleSeedDemos() {
  seeding.value = true;
  emit("seed-demos");
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="mb-6 rounded-2xl border border-tada-200 bg-gradient-to-br from-tada-50 to-white p-6 dark:border-tada-700/30 dark:from-tada-900/20 dark:to-stone-800/50"
    >
      <div class="mb-4 text-center">
        <div class="mb-2 text-3xl">🌿</div>
        <h2 class="text-xl font-bold text-stone-800 dark:text-stone-100">
          Welcome to Rhythms
        </h2>
        <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Rhythms track your natural patterns over time. They're gentle — no guilt, no pressure.
        </p>
      </div>

      <!-- Three rhythm types -->
      <div class="mb-5 space-y-3">
        <div class="flex items-start gap-3 rounded-xl bg-white/70 p-3 dark:bg-stone-800/50">
          <span class="mt-0.5 text-xl">🧘</span>
          <div>
            <div class="font-medium text-stone-800 dark:text-stone-100">Timed Rhythms</div>
            <div class="text-sm text-stone-500 dark:text-stone-400">
              Track duration-based activities like meditation or reading. A day counts when you meet your time threshold.
            </div>
          </div>
        </div>

        <div class="flex items-start gap-3 rounded-xl bg-white/70 p-3 dark:bg-stone-800/50">
          <span class="mt-0.5 text-xl">💪</span>
          <div>
            <div class="font-medium text-stone-800 dark:text-stone-100">Tally Rhythms</div>
            <div class="text-sm text-stone-500 dark:text-stone-400">
              Track count-based activities like press-ups or glasses of water. A day counts when you hit your target reps.
            </div>
          </div>
        </div>

        <div class="flex items-start gap-3 rounded-xl bg-white/70 p-3 dark:bg-stone-800/50">
          <span class="mt-0.5 text-xl">✨</span>
          <div>
            <div class="font-medium text-stone-800 dark:text-stone-100">Activity Rhythms</div>
            <div class="text-sm text-stone-500 dark:text-stone-400">
              Track moments and ta-das — just show up. Any entry on a day counts as complete.
            </div>
          </div>
        </div>
      </div>

      <p class="mb-4 text-center text-xs text-stone-500 dark:text-stone-400">
        Rhythms are views of your entries — deleting a rhythm never deletes your underlying data.
      </p>

      <!-- Actions -->
      <div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          class="min-h-[44px] rounded-xl bg-tada-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-tada-700 disabled:opacity-50"
          :disabled="seeding"
          @click="handleSeedDemos"
        >
          <span v-if="seeding">Creating...</span>
          <span v-else>Try 3 demo rhythms</span>
        </button>
        <button
          class="min-h-[44px] rounded-xl px-6 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-700"
          @click="emit('dismiss')"
        >
          I'll create my own
        </button>
      </div>

      <p class="mt-3 text-center text-xs text-stone-400 dark:text-stone-500">
        Demo rhythms can be deleted anytime.
      </p>
    </div>
  </Transition>
</template>
