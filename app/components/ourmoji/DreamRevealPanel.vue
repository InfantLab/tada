<script setup lang="ts">
/**
 * DreamRevealPanel (US3, T067)
 *
 * Renders the post-guess reveal: hit/miss for send-condition nights,
 * a neutral "control night — no target" for control nights, and a
 * brief rest acknowledgement otherwise.
 */

interface Props {
  /** Reveal payload returned by POST /submissions/{id}/guess. */
  reveal: {
    isHit: boolean | null;
    targetEmoji: string | null;
    condition: "send" | "control" | "rest";
  };
  /** The user's guess emoji (echoed back for layout). */
  guessEmoji: string;
}

defineProps<Props>();

const emit = defineEmits<{
  done: [];
}>();
</script>

<template>
  <section class="space-y-5 text-center">
    <header>
      <h2 class="text-lg font-semibold">Reveal</h2>
    </header>

    <div v-if="reveal.condition === 'send'" class="space-y-3">
      <div class="flex items-center justify-center gap-6 text-5xl">
        <div class="flex flex-col items-center text-sm font-normal text-gray-500">
          <span>{{ guessEmoji }}</span>
          <span class="mt-1 text-xs">your guess</span>
        </div>
        <div class="text-3xl text-gray-400">→</div>
        <div class="flex flex-col items-center text-sm font-normal text-gray-500">
          <span>{{ reveal.targetEmoji }}</span>
          <span class="mt-1 text-xs">target</span>
        </div>
      </div>

      <p
        class="text-2xl font-semibold"
        :class="reveal.isHit ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-300'"
      >
        {{ reveal.isHit ? "✨ Hit!" : "Miss" }}
      </p>
    </div>

    <div v-else-if="reveal.condition === 'control'" class="space-y-3">
      <div class="text-5xl">{{ guessEmoji }}</div>
      <p class="text-base text-gray-700 dark:text-gray-300">
        Control night — no target was sent. Your guess is recorded.
      </p>
    </div>

    <div v-else class="space-y-3">
      <p class="text-base text-gray-700 dark:text-gray-300">
        Rest night — no assignment.
      </p>
    </div>

    <button
      type="button"
      class="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
      @click="emit('done')"
    >
      Done
    </button>
  </section>
</template>
