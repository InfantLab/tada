<script setup lang="ts">
/**
 * Blog Post: What's New in Ta-Da! — March 2026
 */

definePageMeta({
  layout: "default",
  auth: false,
});

useSeoMeta({
  title: "What's New — March 2026 — Ta-Da! Blog",
  description: "Three additions to Ta-Da!: a daily timeline bar, weekly celebration summaries, and a mid-week encouragement check-in.",
  ogTitle: "What's New in Ta-Da! — March 2026",
  ogDescription: "Three additions to Ta-Da!: a daily timeline bar, weekly celebration summaries, and a mid-week encouragement check-in.",
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
          Updates
        </span>
        <span class="text-xs text-stone-500 dark:text-stone-400">
          March 2026
        </span>
        <span class="text-xs text-stone-500 dark:text-stone-400">
          · 3 min read
        </span>
      </div>
      <h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-4">
        What's New — March 2026 📅
      </h1>
      <p class="text-lg text-stone-600 dark:text-stone-400 leading-relaxed">
        Three things worth knowing about in v0.6.0: see when your day happened, get a weekly celebration, and find anything faster.
      </p>
    </header>

    <!-- Content -->
    <div class="prose prose-stone dark:prose-invert max-w-none">

      <h2>Your Timeline now shows when things happened</h2>

      <p>
        Every day in your Timeline now has a coloured bar showing when each entry occurred across a 24-hour window. Your morning meditation sits near the left. An evening run near the right. A combined strip at the top of each day overlays everything at once.
      </p>

      <p>
        No numbers. No axis labels. Just position. It turns a list of entries into something that looks like the shape of your day — and it's easier to take in than a column of timestamps.
      </p>

      <h2>Rhythms will celebrate your week</h2>

      <p>
        Two new optional additions to Rhythms, both off by default:
      </p>

      <ul>
        <li>
          <strong>Monday Celebration</strong> — every Monday morning, Ta-Da! generates a summary of your previous week: sessions completed, time by category, rhythms maintained or extended, any personal records.
        </li>
        <li>
          <strong>Thursday Encouragement</strong> — a shorter mid-week check-in, based on your rolling 4-week average. Quiet weeks are noted gently, never shamed.
        </li>
      </ul>

      <p>
        Turn them on in <strong>Settings → Rhythms</strong>. You can choose how AI-involved they are: pure numbers, your own API key for local processing, or the Ta-Da! cloud in factual or warm tone. Email delivery if you want it, one-click unsubscribe in every message.
      </p>

      <p>
        Neither feature will nag you. The whole point is the opposite.
      </p>

      <h2>Help is easier to navigate</h2>

      <p>
        The Help page now shows a plain one-line description under each section heading — so you can scan and find what you need without opening every accordion.
      </p>

      <h2>A few other fixes</h2>

      <ul>
        <li>Timeline search now understands free text: "last Tuesday", "March 2024".</li>
        <li>Sessions now recovers interrupted timed entries rather than losing them.</li>
        <li>Moments list was showing "No moments yet" even when moments existed — fixed.</li>
      </ul>

      <p class="text-lg font-medium text-tada-600 dark:text-tada-400">
        Ta-Da! ⚡
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
          to="/"
          class="inline-flex items-center gap-2 px-4 py-2 bg-tada-600 hover:bg-tada-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Try Ta-Da! →
        </NuxtLink>
      </div>
    </footer>
  </article>
</template>
