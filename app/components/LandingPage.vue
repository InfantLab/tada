<script setup lang="ts">
/**
 * Landing Page Component
 *
 * Marketing landing page for unauthenticated visitors.
 * Philosophy-driven messaging about mindful life tracking.
 */

const features = [
  {
    icon: "🧘",
    title: "Sessions",
    description: "Meditation timer that counts up, celebrating what you did rather than what's left.",
  },
  {
    icon: "⚡",
    title: "Ta-Da!",
    description: "Capture wins, accomplishments, and moments of gratitude as they happen.",
  },
  {
    icon: "💭",
    title: "Moments",
    description: "Journal dreams, ideas, and reflections. Notice the magic in everyday life.",
  },
  {
    icon: "📊",
    title: "Rhythms",
    description: "Graceful chains that celebrate consistency without punishing breaks.",
  },
];

const philosophyPoints = [
  "Count up, not down — celebrate what you accomplished",
  "Identity over streaks — you're a meditator, not a streak maintainer",
  "Graceful rhythms — missing a day isn't failure",
  "Your data, your control — export anytime, self-host if you want",
];
</script>

<template>
  <div class="min-h-screen bg-pearl-base dark:bg-cosmic-violet">
    <!-- Hero Section -->
    <section class="relative overflow-hidden">
      <div class="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-stone-800 dark:text-stone-100 mb-6">
          Notice Your Life
        </h1>
        <p class="text-xl md:text-2xl text-stone-600 dark:text-stone-300 mb-8 max-w-2xl mx-auto">
          A mindful space for meditation, accomplishments, and the rhythms that shape who you're becoming.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <NuxtLink
            to="/register"
            class="px-8 py-3 bg-tada-600 text-white rounded-xl font-semibold hover:bg-tada-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started Free
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="px-8 py-3 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-xl font-semibold border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
          >
            Sign In
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="py-16 bg-white/50 dark:bg-stone-900/50">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-2xl md:text-3xl font-bold text-center text-stone-800 dark:text-stone-100 mb-12">
          Track What Matters
        </h2>
        <div class="grid md:grid-cols-2 gap-6">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="bg-white dark:bg-stone-800 rounded-2xl p-6 shadow-sm border border-stone-100 dark:border-stone-700"
          >
            <div class="text-4xl mb-4">{{ feature.icon }}</div>
            <h3 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">
              {{ feature.title }}
            </h3>
            <p class="text-stone-600 dark:text-stone-400">
              {{ feature.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Philosophy Section -->
    <section class="py-16">
      <div class="max-w-4xl mx-auto px-4">
        <div class="bg-gradient-to-br from-tada-50 to-amber-50 dark:from-tada-900/20 dark:to-amber-900/20 rounded-3xl p-8 md:p-12">
          <h2 class="text-2xl md:text-3xl font-bold text-stone-800 dark:text-stone-100 mb-8 text-center">
            A Different Kind of Tracker
          </h2>
          <div class="grid md:grid-cols-2 gap-4">
            <div
              v-for="point in philosophyPoints"
              :key="point"
              class="flex items-start gap-3 p-4 bg-white/60 dark:bg-stone-800/60 rounded-xl"
            >
              <span class="text-tada-600 dark:text-tada-400 text-xl">✓</span>
              <span class="text-stone-700 dark:text-stone-300">{{ point }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="py-16 bg-white/50 dark:bg-stone-900/50">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-2xl md:text-3xl font-bold text-center text-stone-800 dark:text-stone-100 mb-4">
          Simple Pricing
        </h2>
        <p class="text-center text-stone-600 dark:text-stone-400 mb-12">
          Start free, upgrade if you want unlimited history.
        </p>
        <div class="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <!-- Free Tier -->
          <div class="bg-white dark:bg-stone-800 rounded-2xl p-8 border border-stone-200 dark:border-stone-700">
            <h3 class="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">Free</h3>
            <p class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-4">
              $0
              <span class="text-base font-normal text-stone-500">/forever</span>
            </p>
            <ul class="space-y-3 mb-6">
              <li class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                <span class="text-green-500">✓</span>
                All features included
              </li>
              <li class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                <span class="text-green-500">✓</span>
                1 year data history
              </li>
              <li class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                <span class="text-green-500">✓</span>
                Export anytime
              </li>
            </ul>
            <NuxtLink
              to="/register"
              class="block w-full text-center px-6 py-3 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl font-semibold hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
            >
              Get Started
            </NuxtLink>
          </div>

          <!-- Premium Tier -->
          <div class="bg-white dark:bg-stone-800 rounded-2xl p-8 border-2 border-tada-500 relative">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-tada-600 text-white text-sm font-medium rounded-full">
              Most Popular
            </div>
            <h3 class="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">Premium</h3>
            <p class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-4">
              $5
              <span class="text-base font-normal text-stone-500">/month</span>
            </p>
            <p class="text-sm text-stone-500 dark:text-stone-400 mb-4">
              or $50/year (save $10)
            </p>
            <ul class="space-y-3 mb-6">
              <li class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                <span class="text-green-500">✓</span>
                Unlimited data history
              </li>
              <li class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                <span class="text-green-500">✓</span>
                Priority support
              </li>
              <li class="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                <span class="text-green-500">✓</span>
                Early access to features
              </li>
            </ul>
            <NuxtLink
              to="/register"
              class="block w-full text-center px-6 py-3 bg-tada-600 text-white rounded-xl font-semibold hover:bg-tada-700 transition-colors"
            >
              Start Free Trial
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Open Source Section -->
    <section class="py-16">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <div class="text-4xl mb-4">🌱</div>
        <h2 class="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-4">
          Open Source & Self-Hostable
        </h2>
        <p class="text-stone-600 dark:text-stone-400 mb-6 max-w-xl mx-auto">
          Ta-Da! is fully open source. Self-host on your own server for complete control,
          or use our hosted service for convenience.
        </p>
        <a
          href="https://github.com/infantlab/tada"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 text-tada-600 hover:text-tada-700 dark:text-tada-400 dark:hover:text-tada-300 font-medium"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          View on GitHub
        </a>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-8 border-t border-stone-200 dark:border-stone-700">
      <div class="max-w-4xl mx-auto px-4">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <img src="/icons/tada-logotype.png" alt="Ta-Da!" class="h-8" />
          </div>
          <nav class="flex gap-6 text-sm text-stone-600 dark:text-stone-400">
            <NuxtLink to="/privacy" class="hover:text-tada-600 dark:hover:text-tada-400">
              Privacy
            </NuxtLink>
            <NuxtLink to="/terms" class="hover:text-tada-600 dark:hover:text-tada-400">
              Terms
            </NuxtLink>
            <NuxtLink to="/help" class="hover:text-tada-600 dark:hover:text-tada-400">
              Help
            </NuxtLink>
            <a
              href="https://github.com/infantlab/tada"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-tada-600 dark:hover:text-tada-400"
            >
              GitHub
            </a>
          </nav>
        </div>
        <p class="text-center text-sm text-stone-500 dark:text-stone-500 mt-6">
          Made with 💚 for mindful humans everywhere
        </p>
      </div>
    </footer>
  </div>
</template>
