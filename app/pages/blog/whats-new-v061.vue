<script setup lang="ts">
/**
 * Blog Post: What's New in v0.6.0 & v0.6.1 — Spring 2026
 */

definePageMeta({
  layout: "default",
  auth: false,
});

useSeoMeta({
  title: "What's New in v0.6.0 & v0.6.1 — Ta-Da! Blog",
  description: "Daily timelines, weekly celebrations, push notifications, and a full WCAG 2.2 AA accessibility overhaul across three phases.",
  ogTitle: "What's New in Ta-Da! — v0.6.0 & v0.6.1",
  ogDescription: "Daily timelines, weekly celebrations, push notifications, and a full WCAG 2.2 AA accessibility overhaul across three phases.",
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
          · 5 min read
        </span>
      </div>
      <h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-4">
        Spring 2026: See Your Day, Celebrate Your Week, Welcome Everyone
      </h1>
      <p class="text-lg text-stone-600 dark:text-stone-400 leading-relaxed">
        Two releases in quick succession. v0.6.0 added daily timelines and weekly celebrations. v0.6.1 followed with push notifications, a PWA upgrade, and a comprehensive accessibility overhaul. Here's everything that changed.
      </p>
    </header>

    <!-- Content -->
    <div class="prose prose-stone dark:prose-invert max-w-none">

      <h2>Daily Timeline Bars (v0.6.0)</h2>

      <p>
        Every day in your Timeline now has a coloured bar showing when each entry happened across a 24-hour window. Your morning meditation sits near the left. An evening run near the right. A combined strip at the top of each day overlays everything at once — colour-coded by category, no axis labels, just the shape of your day.
      </p>

      <p>
        Short entries and instant entries (ta-das, moments, tallies) appear as dots. Overlapping timed entries use semi-transparent layering. Pure CSS, no charting library, responsive from 320px to wide desktop.
      </p>

      <h2>Weekly Celebrations & Encouragement (v0.6.0)</h2>

      <p>
        Two new optional weekly touchpoints, both off by default:
      </p>

      <ul>
        <li>
          <strong>Monday Celebration</strong> — a summary of your previous week: sessions completed, time by category, rhythms maintained or extended, personal records. Four privacy tiers from pure numbers to warm AI-written summaries.
        </li>
        <li>
          <strong>Thursday Encouragement</strong> — a gentle mid-week check-in based on your rolling 4-week average. Quiet weeks are noted gently, never shamed.
        </li>
      </ul>

      <p>
        Turn them on in <strong>Settings → Rhythms</strong>. Email delivery or in-app only — one-click unsubscribe in every message.
      </p>

      <h2>Push Notifications (v0.6.1)</h2>

      <p>
        Monday celebrations and Thursday encouragements can now arrive as push notifications — even when Ta-Da! isn't open. Self-hosted operators generate VAPID keys and set three env vars; users opt in from Settings. Supported on Android Chrome, desktop Chromium, and iOS 16.4+ (home screen install required).
      </p>

      <h2>PWA Improvements (v0.6.1)</h2>

      <p>
        The installed app feels more native now. Maskable icon fixed for Android home screens, app identity pinned so reinstalls are recognised, quick-action shortcuts (New Entry, Record Dream, New Tally) from a long-press on the icon, a branded offline page instead of a browser error, and screen wake lock during voice recording.
      </p>

      <h2>Accessibility: WCAG 2.2 AA in Three Phases (v0.6.1)</h2>

      <p>
        The biggest investment in v0.6.1 was a comprehensive accessibility audit and implementation across three phases, touching 50+ files. Ta-Da! is now significantly more usable for keyboard-only users, screen reader users, and people with colour vision deficiencies.
      </p>

      <h3>Screen readers</h3>

      <p>
        Every page has a skip-to-main-content link. All modals announce as dialogs with proper ARIA attributes. Form labels are wired to their inputs. Filter and toggle buttons announce their state. The timeline announces filter results as they change. Settings toggles use <code>role="switch"</code> so screen readers speak "on" and "off" rather than nothing.
      </p>

      <h3>Keyboard navigation</h3>

      <p>
        Focus traps keep Tab/Shift+Tab inside open modals — no more tabbing into the page behind a backdrop. The year heatmap is a proper keyboard grid: arrow keys move between days, Enter or Space selects, Home and End jump to the start or end. Rhythm accordion panels are now buttons with <code>aria-expanded</code>.
      </p>

      <h3>Colour & contrast</h3>

      <p>
        Heatmaps moved from a green scale to a violet sequential scale — easily distinguishable under deuteranopia, protanopia, and tritanopia. Four category colours (Creative, Social, Life Admin, Events) were darkened to meet the 3:1 minimum contrast ratio on white backgrounds. Button text on the brand-colour background was fixed across Settings. Text contrast was improved throughout.
      </p>

      <h3>Reduced motion</h3>

      <p>
        The celebration overlay — confetti, bouncing emoji, fade effects — now respects <code>prefers-reduced-motion: reduce</code>. If your OS is set to reduce motion, you still see the celebration message, just without the animation.
      </p>

      <h2>Bug fixes worth mentioning</h2>

      <ul>
        <li><strong>Registration errors</strong> — failed registration (username taken, password too short) now shows the actual reason instead of a generic message.</li>
        <li><strong>Android mic noise</strong> — recording no longer produces loud beeping on Android Chrome. The fix: disabling audio processing constraints that triggered Android's communication audio routing.</li>
        <li><strong>Moments list</strong> — the "No moments yet" false empty state is fixed.</li>
        <li><strong>What's New overlay</strong> — "Yes, turn it on!" now navigates to the right section of Settings.</li>
      </ul>

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
