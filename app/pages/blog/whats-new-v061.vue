<script setup lang="ts">
/**
 * Blog Post: What's New — Spring 2026 (v0.6.0 + v0.6.1)
 */

definePageMeta({
  layout: "default",
  auth: false,
});

useSeoMeta({
  title: "What's New — Spring 2026 — Ta-Da! Blog",
  description: "See the shape of your day, get a Monday celebration, and use Ta-Da! your way — with keyboard, screen reader, or however works for you.",
  ogTitle: "What's New in Ta-Da! — Spring 2026",
  ogDescription: "See the shape of your day, get a Monday celebration, and use Ta-Da! your way — with keyboard, screen reader, or however works for you.",
});
</script>

<template>
  <article class="max-w-2xl mx-auto px-4 py-8">
    <!-- Navigation -->
    <NuxtLink
      to="/blog"
      class="inline-flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors mb-8"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          April 2026
        </span>
        <span class="text-xs text-stone-500 dark:text-stone-400">
          · 4 min read
        </span>
      </div>
      <h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-4">
        See Your Day, Celebrate Your Week, Welcome Everyone
      </h1>
      <p class="text-lg text-stone-600 dark:text-stone-400 leading-relaxed">
        Two updates this month. The first adds daily timelines and weekly celebrations. The second makes Ta-Da! work better for everyone — especially if you use a keyboard, a screen reader, or have trouble with certain colour combinations.
      </p>
    </header>

    <!-- Content -->
    <div class="prose prose-stone dark:prose-invert max-w-none">

      <h2>Your day has a shape now</h2>

      <p>
        Every day in your Timeline has a coloured bar showing when each entry happened. Morning meditation near the left. Evening run near the right. A combined strip at the top overlays everything at once, colour-coded by category.
      </p>

      <p>
        No numbers. No axis labels. Just position. It turns a list of entries into something that looks like the shape of your day — easier to take in than a column of timestamps.
      </p>

      <p>
        Short entries and instant entries (ta-das, moments, tallies) appear as dots. Overlapping sessions layer transparently so you can still read both.
      </p>

      <h2>Monday celebrations</h2>

      <p>
        Every Monday morning, Ta-Da! can send you a summary of your previous week — sessions completed, time by category, rhythms maintained or extended, any personal records. It's optional and off by default. Turn it on in <strong>Settings → Rhythms</strong>.
      </p>

      <p>
        You choose how it's written. Pure numbers if you want the facts. Or a warmer, AI-written version that notices what you actually did and says something about it. Four options, from no AI at all to celebratory.
      </p>

      <h2>Thursday encouragement</h2>

      <p>
        A shorter mid-week check-in, based on how your week compares to your recent average. Also optional, also off by default. Quiet weeks are noted gently. Nothing is shamed.
      </p>

      <p>
        Both can arrive by email, in the app, or — new in the second update — as a notification on your phone or desktop, even when Ta-Da! isn't open.
      </p>

      <h2>Ta-Da! for everyone</h2>

      <p>
        The biggest piece of work in these updates was making Ta-Da! more usable for more people. Not a checkbox exercise — a real pass through every screen, asking "can someone actually use this?"
      </p>

      <p>
        <strong>If you navigate with a keyboard:</strong> Tab now stays inside popups and dialogs instead of wandering into the page behind them. The year heatmap on Rhythms responds to arrow keys — move between days, press Enter to select one. Accordion panels are proper buttons you can activate without a mouse.
      </p>

      <p>
        <strong>If you use a screen reader:</strong> Modals announce themselves when they open. Buttons describe their current state — "filter: selected" or "toggle: on" — instead of just their label. When you filter your timeline, the results are announced. Every day in the year heatmap has a description like "April 1: 3 entries."
      </p>

      <p>
        <strong>If you have trouble distinguishing colours:</strong> The rhythm heatmaps used to be green, which is hard to read for people with red-green colour blindness (about 8% of men). They're now violet — distinguishable under all common types of colour vision deficiency. We also darkened several category colours that were too faint against white backgrounds.
      </p>

      <p>
        <strong>If you prefer less motion:</strong> The celebration confetti and bouncing animations respect your system setting. If you've told your OS to reduce motion, you still see the celebration — just without the fireworks.
      </p>

      <h2>The app on your home screen</h2>

      <p>
        If you've installed Ta-Da! to your home screen, a few things got better. The icon looks right on Android now (no more awkward cropping). Long-press gives you shortcuts to New Entry, Record Dream, and New Tally. Going offline shows a proper page instead of a browser error. And the screen stays on while you're voice-recording — no more mid-sentence interruptions.
      </p>

      <h2>Fixes</h2>

      <p>
        Registration errors now tell you what actually went wrong instead of a generic "failed" message. The moments list no longer says "No moments yet" when you clearly have moments. And "Yes, turn it on!" in the What's New popup now takes you to the right place.
      </p>

      <p class="text-lg font-medium text-tada-700 dark:text-tada-400">
        Ta-Da!
      </p>
    </div>

    <!-- Footer -->
    <footer class="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <NuxtLink
          to="/blog"
          class="text-tada-700 dark:text-tada-400 hover:underline"
        >
          ← More articles
        </NuxtLink>
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 px-4 py-2 bg-tada-600 hover:bg-tada-700 text-stone-900 rounded-lg transition-colors text-sm font-medium"
        >
          Try Ta-Da! →
        </NuxtLink>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.prose h2 {
  @apply text-xl font-semibold text-stone-800 dark:text-stone-100 mt-8 mb-4;
}

.prose h3 {
  @apply text-lg font-semibold text-stone-800 dark:text-stone-100 mt-6 mb-3;
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

.prose code {
  @apply text-sm bg-stone-100 dark:bg-stone-700 px-1 py-0.5 rounded;
}
</style>
