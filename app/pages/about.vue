<script setup lang="ts">
/**
 * About Page
 *
 * Dedicated page for philosophy, story, credits, and links.
 * Accessible from the help panel for logged-in users.
 */

definePageMeta({
  layout: "default",
});

// App version - fetched dynamically
const appVersion = ref("0.4.0");
const gitHash = ref("");

onMounted(async () => {
  try {
    const versionInfo = await $fetch("/api/version");
    appVersion.value = versionInfo.version;
    gitHash.value = versionInfo.gitShortHash;
  } catch (error) {
    console.error("Failed to fetch version info:", error);
  }
});

const philosophyPoints = [
  {
    icon: "⚡",
    title: "Ta-Da! Not To-Do",
    description: "Most productivity apps focus on what you haven't done yet, creating pressure and guilt. Ta-Da! celebrates what you have done — turning obligation into accomplishment, anxiety into joy. It's not about checking boxes, it's about noticing progress.",
  },
  {
    icon: "⬆️",
    title: "Count Up, Not Down",
    description: "Traditional timers count down, creating pressure. Ta-Da! counts up — celebrating what you accomplished rather than what's remaining.",
    link: "/blog/counting-up",
  },
  {
    icon: "🧘",
    title: "Identity Over Streaks",
    description: "You're a meditator who sometimes misses days, not a streak that can be broken. Your practice is part of who you are.",
    link: "/blog/identity-over-streaks",
  },
  {
    icon: "🌊",
    title: "Graceful Rhythms",
    description: "Missing a day isn't failure — it's part of a longer rhythm. Life has seasons, and Ta-Da! celebrates the pattern, not perfection.",
    link: "/blog/graceful-rhythms",
  },
  {
    icon: "🔐",
    title: "Your Data, Your Control",
    description: "Export your data anytime. Self-host if you want. Your memories and progress belong to you, not us.",
  },
];

const blogPosts = [
  {
    title: "Why Our Timer Counts Up",
    description: "The philosophy behind celebrating accomplishment over remaining time.",
    link: "/blog/counting-up",
  },
  {
    title: "Identity Over Streaks",
    description: "Why we focus on who you're becoming, not maintaining unbroken chains.",
    link: "/blog/identity-over-streaks",
  },
  {
    title: "Graceful Rhythms",
    description: "How missing a day can be part of a beautiful pattern.",
    link: "/blog/graceful-rhythms",
  },
];
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="text-center mb-12">
      <img
        src="/icons/tada-logotype.png"
        alt="TA-DA"
        class="h-20 w-auto mx-auto mb-6"
      />
      <h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-2">
        About Ta-Da!
      </h1>
      <p class="text-lg text-stone-600 dark:text-stone-400">
        Track Activities, Discover Achievements
      </p>
      <p class="text-sm text-stone-500 dark:text-stone-500 mt-2">
        v{{ appVersion }}<template v-if="gitHash">+{{ gitHash }}</template>
      </p>
    </div>

    <!-- Philosophy Section -->
    <section class="mb-12">
      <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-6">
        Our Philosophy
      </h2>
      <div class="space-y-4">
        <div
          v-for="point in philosophyPoints"
          :key="point.title"
          class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-5"
        >
          <div class="flex items-start gap-4">
            <span class="text-2xl">{{ point.icon }}</span>
            <div class="flex-1">
              <h3 class="font-semibold text-stone-800 dark:text-stone-100 mb-1">
                {{ point.title }}
              </h3>
              <p class="text-sm text-stone-600 dark:text-stone-400">
                {{ point.description }}
              </p>
              <NuxtLink
                v-if="point.link"
                :to="point.link"
                class="inline-flex items-center gap-1 text-sm text-tada-600 dark:text-tada-400 hover:underline mt-2"
              >
                Read more
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Blog Section -->
    <section class="mb-12">
      <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-6">
        From the Blog
      </h2>
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700">
        <NuxtLink
          v-for="post in blogPosts"
          :key="post.link"
          :to="post.link"
          class="block p-4 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors"
        >
          <h3 class="font-medium text-stone-800 dark:text-stone-100">
            {{ post.title }}
          </h3>
          <p class="text-sm text-stone-600 dark:text-stone-400 mt-1">
            {{ post.description }}
          </p>
        </NuxtLink>
        <NuxtLink
          to="/blog"
          class="block p-4 text-center text-sm text-tada-600 dark:text-tada-400 hover:underline"
        >
          View all posts
        </NuxtLink>
      </div>
    </section>

    <!-- Open Source Section -->
    <section class="mb-12">
      <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-6">
        Open Source
      </h2>
      <div class="bg-gradient-to-br from-tada-50 to-amber-50 dark:from-tada-900/20 dark:to-amber-900/20 rounded-xl border border-tada-200 dark:border-tada-700 p-6">
        <p class="text-stone-700 dark:text-stone-300 mb-4">
          Ta-Da! is open source software. You can run it on your own server,
          contribute to development, or just peek at how it works.
        </p>
        <div class="flex flex-wrap gap-4">
          <a
            href="https://github.com/InfantLab/tada"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg border border-stone-200 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
          <a
            href="https://github.com/InfantLab/tada/blob/main/LICENSE"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg border border-stone-200 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
          >
            <span class="text-lg">📜</span>
            AGPL-3.0 License
          </a>
          <a
            href="/docs/DEVELOPER_GUIDE.md"
            target="_blank"
            class="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg border border-stone-200 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
          >
            <span class="text-lg">📚</span>
            Documentation
          </a>
        </div>
      </div>
    </section>

    <!-- Credits Section -->
    <section class="mb-12">
      <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-6">
        Credits
      </h2>
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-6">
        <!-- Creator -->
        <div>
          <h3 class="font-semibold text-stone-800 dark:text-stone-100 mb-2">Created by</h3>
          <p class="text-stone-600 dark:text-stone-400">
            <a
              href="https://github.com/InfantLab"
              target="_blank"
              class="text-tada-600 dark:text-tada-400 hover:underline font-medium"
            >Dr. Caspar Addyman</a>
            — Developmental psychologist, writer, and mindful technologist.
          </p>
        </div>

        <!-- Philosophy -->
        <div>
          <h3 class="font-semibold text-stone-800 dark:text-stone-100 mb-2">Philosophy & Design</h3>
          <p class="text-stone-600 dark:text-stone-400">
            Ta-Da! emerged from 11+ years of personal meditation practice and a desire to track life 
            without the pressure of traditional productivity apps. The celebration-based approach comes 
            from understanding how humans actually change — through noticing, not nagging.
          </p>
        </div>

        <!-- Technology -->
        <div>
          <h3 class="font-semibold text-stone-800 dark:text-stone-100 mb-2">Built With</h3>
          <div class="flex flex-wrap gap-2">
            <span class="px-3 py-1 bg-stone-100 dark:bg-stone-700 rounded-full text-sm text-stone-700 dark:text-stone-300">
              Nuxt 3
            </span>
            <span class="px-3 py-1 bg-stone-100 dark:bg-stone-700 rounded-full text-sm text-stone-700 dark:text-stone-300">
              Vue 3
            </span>
            <span class="px-3 py-1 bg-stone-100 dark:bg-stone-700 rounded-full text-sm text-stone-700 dark:text-stone-300">
              Tailwind CSS
            </span>
            <span class="px-3 py-1 bg-stone-100 dark:bg-stone-700 rounded-full text-sm text-stone-700 dark:text-stone-300">
              SQLite
            </span>
            <span class="px-3 py-1 bg-stone-100 dark:bg-stone-700 rounded-full text-sm text-stone-700 dark:text-stone-300">
              Drizzle ORM
            </span>
            <span class="px-3 py-1 bg-stone-100 dark:bg-stone-700 rounded-full text-sm text-stone-700 dark:text-stone-300">
              Lucia Auth
            </span>
          </div>
        </div>

        <!-- Community -->
        <div>
          <h3 class="font-semibold text-stone-800 dark:text-stone-100 mb-2">Community & Contributors</h3>
          <p class="text-stone-600 dark:text-stone-400 mb-3">
            Special thanks to everyone who contributes ideas, feedback, and code. Your input shapes Ta-Da!
          </p>
          <a
            href="https://github.com/InfantLab/tada/graphs/contributors"
            target="_blank"
            class="inline-flex items-center gap-2 text-sm text-tada-600 dark:text-tada-400 hover:underline"
          >
            View all contributors on GitHub
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <!-- Inspiration -->
        <div>
          <h3 class="font-semibold text-stone-800 dark:text-stone-100 mb-2">Inspired by</h3>
          <p class="text-stone-600 dark:text-stone-400">
            The "count up" philosophy from meditation timers, 
            <a href="https://www.goodreads.com/book/show/52036" target="_blank" class="text-tada-600 dark:text-tada-400 hover:underline">Atomic Habits</a> by James Clear, 
            and the mindful approach of 
            <a href="https://zenhabits.net/" target="_blank" class="text-tada-600 dark:text-tada-400 hover:underline">Leo Babauta</a>.
          </p>
        </div>

        <!-- Fun fact -->
        <div class="pt-4 border-t border-stone-200 dark:border-stone-700">
          <p class="text-sm text-stone-500 dark:text-stone-500 italic">
            🍵 Powered by lots of tea, occasional insight, and the belief that small celebrations matter.
          </p>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="mb-12">
      <h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-6">
        Get in Touch
      </h2>
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
        <div class="flex flex-wrap gap-4">
          <NuxtLink
            to="/feedback"
            class="inline-flex items-center gap-2 px-4 py-2 bg-tada-600 text-white rounded-lg hover:bg-tada-700 transition-colors"
          >
            <span class="text-lg">💬</span>
            Send Feedback
          </NuxtLink>
          <NuxtLink
            to="/help"
            class="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
          >
            <span class="text-lg">❓</span>
            FAQ & Help
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Legal Links -->
    <section class="text-center text-sm text-stone-500 dark:text-stone-500 space-y-2">
      <div class="flex flex-wrap justify-center gap-4">
        <NuxtLink to="/privacy" class="hover:underline">
          Privacy Policy
        </NuxtLink>
        <NuxtLink to="/terms" class="hover:underline">
          Terms of Service
        </NuxtLink>
        <NuxtLink to="/dpa" class="hover:underline">
          Data Protection
        </NuxtLink>
      </div>
      <p>
        Made with care for mindful life tracking.
      </p>
    </section>
  </div>
</template>
