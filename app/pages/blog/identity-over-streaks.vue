<script setup lang="ts">
/**
 * Blog Post: Identity Over Streaks
 */

definePageMeta({
  layout: "default",
  auth: false,
});

useSeoMeta({
  title: "Identity Over Streaks - Ta-Da! Blog",
  description: "Streaks are fragile — one missed day breaks them. But identity is resilient. You're a meditator, not someone who hasn't missed a day.",
  ogTitle: "Identity Over Streaks",
  ogDescription: "Streaks are fragile — one missed day breaks them. But identity is resilient.",
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
          · 5 min read
        </span>
      </div>
      <h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-4">
        Identity Over Streaks 🌱
      </h1>
      <p class="text-lg text-stone-600 dark:text-stone-400 leading-relaxed">
        Streaks are fragile — one missed day breaks them. But identity is resilient. You're a meditator, not someone who hasn't missed a day.
      </p>
    </header>

    <!-- Content -->
    <div class="prose prose-stone dark:prose-invert max-w-none">
      <p>
        There's a particular kind of anxiety that streak trackers create. You've been meditating for 47 days straight. Day 48 arrives, and life happens — a sick child, an early flight, a crisis at work. By the time you remember your practice, midnight has passed.
      </p>

      <p>
        <strong>47 days → 0 days.</strong>
      </p>

      <p>
        That's the streak mentality. All-or-nothing. Perfect or failed. The number resets, and with it, something in your motivation deflates.
      </p>

      <h2>The Problem with Streaks</h2>

      <p>
        Streaks work — for a while. They provide a simple, visible metric. They tap into loss aversion: you don't want to "break" what you've built. But this same psychology makes them fragile:
      </p>

      <ul>
        <li><strong>One miss erases everything.</strong> Weeks of consistency become "starting over."</li>
        <li><strong>Anxiety replaces presence.</strong> You meditate to maintain the streak, not for the practice itself.</li>
        <li><strong>Life becomes the enemy.</strong> Travel, illness, and unexpected events are threats rather than just... life.</li>
        <li><strong>Guilt accumulates.</strong> Breaking a streak often leads to shame spirals and longer breaks.</li>
      </ul>

      <p>
        Many people report that after breaking a long streak, they abandon the practice entirely for weeks or months. The tool meant to help consistency actually undermines it.
      </p>

      <h2>The Identity Alternative</h2>

      <p>
        Here's a different frame: instead of tracking "days without missing," track <em>who you're becoming</em>.
      </p>

      <p>
        After 47 days of meditation, you haven't just accumulated a number. You've built neural pathways. Developed a relationship with stillness. Learned what your mind does when left alone. You've become someone who meditates.
      </p>

      <p>
        One missed day doesn't erase that. You're still a meditator — just a meditator who didn't meditate yesterday.
      </p>

      <p>
        The question shifts from "How long is my streak?" to "Who am I becoming?"
      </p>

      <h2>What the Research Shows</h2>

      <p>
        James Clear, author of <em>Atomic Habits</em>, calls this "identity-based habits." The idea is simple but powerful: lasting behavior change comes from changing how you see yourself, not from willpower or tracking.
      </p>

      <p>
        When you say "I'm a meditator" rather than "I'm trying to meditate every day," several things shift:
      </p>

      <ul>
        <li>Missed days become anomalies, not failures</li>
        <li>Returning to practice feels natural, not like starting over</li>
        <li>The practice integrates into who you are, not what you do</li>
      </ul>

      <p>
        Studies on habit formation support this. People who see a behavior as part of their identity maintain it longer and recover faster from lapses.
      </p>

      <h2>How Ta-Da! Supports Identity</h2>

      <p>
        This is why we built Ta-Da! the way we did:
      </p>

      <ul>
        <li><strong>Journey stages</strong> (Starting → Building → Becoming → Being) mark accumulated hours, not consecutive days</li>
        <li><strong>Graceful chains</strong> celebrate consistency while tolerating gaps</li>
        <li><strong>Total hours</strong> matter more than daily streaks</li>
        <li><strong>Encouragement messages</strong> use identity language: "You're becoming a meditator"</li>
      </ul>

      <p>
        Missing a day doesn't reset your 200 hours of practice. It doesn't change your journey stage. It's just one day.
      </p>

      <h2>A Kinder Frame</h2>

      <p>
        What if we could track our practices with the same compassion we'd offer a friend?
      </p>

      <p>
        Your friend comes to you: "I've been meditating almost daily for two months, but I missed yesterday." Would you say, "Well, you're back to zero now"? Of course not. You'd say, "That's amazing! Two months of practice! One day doesn't change that."
      </p>

      <p>
        Ta-Da! tries to be that friend. We count what you did. We celebrate your patterns without punishing your gaps. We trust that you're becoming who you want to become, one day at a time — or almost every day.
      </p>

      <p class="text-lg font-medium text-tada-600 dark:text-tada-400">
        You're already on your way. 🌱
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
          to="/rhythms"
          class="inline-flex items-center gap-2 px-4 py-2 bg-tada-600 text-white rounded-lg font-medium hover:bg-tada-700 transition-colors"
        >
          View your rhythms
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
