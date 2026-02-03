<script setup lang="ts">
/**
 * Blog Post: Why We Count Up
 */

definePageMeta({
  layout: "default",
  auth: false,
});

useSeoMeta({
  title: "Why We Count Up - Ta-Da! Blog",
  description: "Traditional timers count down, creating pressure. What if we celebrated what we accomplished instead?",
  ogTitle: "Why We Count Up",
  ogDescription: "Traditional timers count down, creating pressure. What if we celebrated what we accomplished instead?",
});
</script>

<template>
  <article class="max-w-2xl mx-auto px-4 py-8">
    <!-- Navigation -->
    <NuxtLink
      to="/blog"
      class="inline-flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors mb-8"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Blog
    </NuxtLink>

    <!-- Header -->
    <header class="mb-8">
      <div class="flex items-center gap-2 mb-4">
        <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
          Philosophy
        </span>
        <span class="text-xs text-stone-500 dark:text-stone-400">
          February 2026
        </span>
        <span class="text-xs text-stone-500 dark:text-stone-400">
          · 4 min read
        </span>
      </div>
      <h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-4">
        Why We Count Up ⬆️
      </h1>
      <p class="text-lg text-stone-600 dark:text-stone-400 leading-relaxed">
        Traditional timers count down, creating pressure and anxiety. What if we flipped the script and celebrated what we accomplished instead?
      </p>
    </header>

    <!-- Content -->
    <div class="prose prose-stone dark:prose-invert max-w-none">
      <p>
        Picture this: You sit down to meditate. You set a timer for 20 minutes. The timer starts: <strong>19:59... 19:58... 19:57...</strong>
      </p>

      <p>
        What does your mind do? It starts calculating. "Almost 20 minutes left. This is going to take forever. When will this be over?"
      </p>

      <p>
        The countdown creates a subtle but persistent pressure. Your meditation becomes about waiting for something to end rather than experiencing the present moment. The timer, ironically, pulls you out of the very presence you're trying to cultivate.
      </p>

      <h2>The Count-Up Alternative</h2>

      <p>
        Now imagine the same session, but different. You sit down. The timer starts: <strong>0:01... 0:02... 0:03...</strong>
      </p>

      <p>
        There's nothing to wait for. Each moment is an accumulation, not a depletion. When you finish and see "47:23" on the screen, the message is clear: <em>"You just meditated for 47 minutes!"</em>
      </p>

      <p>
        That's a celebration, not a relief. You did something. The timer counted what you accomplished.
      </p>

      <h2>The Psychology Behind It</h2>

      <p>
        This isn't just a design preference — it's rooted in how our brains process goals and achievements.
      </p>

      <p>
        <strong>Countdown timers emphasize scarcity.</strong> They remind you of what's remaining, what you haven't yet done, what you're waiting for. This triggers the same psychology as deadlines and pressure.
      </p>

      <p>
        <strong>Count-up timers emphasize abundance.</strong> Every second that passes is something you've done, something you've accumulated. Your session grows rather than shrinks.
      </p>

      <p>
        Research on goal-setting consistently shows that focusing on progress made (rather than distance remaining) increases motivation and satisfaction. Count-up timers naturally create this "progress focus."
      </p>

      <h2>Beyond Meditation</h2>

      <p>
        This philosophy extends beyond timers. Throughout Ta-Da!, we focus on what you did, not what you missed:
      </p>

      <ul>
        <li><strong>Rhythms</strong> track your patterns without punishing gaps</li>
        <li><strong>Chains</strong> celebrate consistency without breaking from one missed day</li>
        <li><strong>Ta-Das</strong> capture wins rather than tracking uncompleted tasks</li>
      </ul>

      <p>
        The underlying principle is the same: your life is an accumulation of what you do, not a countdown of what remains.
      </p>

      <h2>Try It Yourself</h2>

      <p>
        Next time you sit for a practice, try counting up. Notice how different it feels. There's no "only 5 more minutes" — just this moment, and this one, and this one.
      </p>

      <p>
        And when you finish, look at what you did. You meditated. You practiced. You showed up.
      </p>

      <p class="text-lg font-medium text-tada-600 dark:text-tada-400">
        Ta-Da! 🎉
      </p>
    </div>

    <!-- Footer -->
    <footer class="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <NuxtLink
          to="/blog"
          class="text-tada-600 dark:text-tada-400 hover:underline"
        >
          ← More articles
        </NuxtLink>
        <NuxtLink
          to="/sessions"
          class="inline-flex items-center gap-2 px-4 py-2 bg-tada-600 text-white rounded-lg font-medium hover:bg-tada-700 transition-colors"
        >
          Try a count-up session
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </NuxtLink>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.prose h2 {
  @apply text-xl font-semibold text-stone-800 dark:text-stone-100 mt-8 mb-4;
}

.prose p {
  @apply text-stone-600 dark:text-stone-400 leading-relaxed mb-4;
}

.prose ul {
  @apply list-disc list-inside space-y-2 mb-4 text-stone-600 dark:text-stone-400;
}

.prose strong {
  @apply text-stone-800 dark:text-stone-200 font-semibold;
}

.prose em {
  @apply italic;
}
</style>
