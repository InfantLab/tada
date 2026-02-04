<script setup lang="ts">
/**
 * GettingStartedCard - First week guidance card
 *
 * A warm, friendly card that appears on the home page for new users.
 * Philosophy: like a friend showing you around, not a tutorial.
 *
 * - Shows until dismissed
 * - Highlights key areas to explore
 * - Emphasizes the "count up" philosophy
 */

const { shouldShowFirstWeekCard, dismissFirstWeekCard } = useOnboarding();

const quickStarts = [
  {
    icon: "🧘",
    label: "Sessions",
    description: "Time your meditations or focus sessions",
    to: "/sessions",
  },
  {
    icon: "⚡",
    label: "Ta-Da!",
    description: "Celebrate wins as they happen",
    to: "/tada",
  },
  {
    icon: "💭",
    label: "Moments",
    description: "Capture thoughts and reflections",
    to: "/moments",
  },
  {
    icon: "🌊",
    label: "Rhythms",
    description: "Track gentle, flexible habits",
    to: "/rhythms",
  },
];
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="shouldShowFirstWeekCard"
      class="mb-4 p-5 bg-gradient-to-br from-tada-50 via-white to-amber-50 dark:from-tada-900/30 dark:via-stone-800/50 dark:to-amber-900/20 border border-tada-200 dark:border-tada-700/50 rounded-2xl shadow-sm"
    >
      <div class="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 class="text-base font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <span class="text-xl">✨</span>
            Getting Started
          </h3>
          <p class="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Ta-Da! counts up, not down. Celebrate what you did, not what you missed.
          </p>
        </div>
        <button
          class="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50"
          title="Dismiss"
          @click="dismissFirstWeekCard"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Quick start grid -->
      <div class="grid grid-cols-2 gap-2">
        <NuxtLink
          v-for="item in quickStarts"
          :key="item.label"
          :to="item.to"
          class="group flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/40 hover:border-tada-300 dark:hover:border-tada-600 hover:bg-white dark:hover:bg-stone-800/60 transition-all"
        >
          <span class="text-2xl group-hover:scale-110 transition-transform">{{ item.icon }}</span>
          <div class="min-w-0">
            <span class="block text-sm font-medium text-stone-800 dark:text-stone-100 group-hover:text-tada-700 dark:group-hover:text-tada-400 transition-colors">
              {{ item.label }}
            </span>
            <span class="block text-xs text-stone-500 dark:text-stone-400 leading-tight">
              {{ item.description }}
            </span>
          </div>
        </NuxtLink>
      </div>

      <!-- Philosophy note -->
      <p class="mt-4 text-xs text-stone-500 dark:text-stone-500 text-center">
        Start anywhere. There's no wrong way to use Ta-Da!
      </p>
    </div>
  </Transition>
</template>
