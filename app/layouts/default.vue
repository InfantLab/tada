<script setup lang="ts">
const navigation = [
  { name: "Timeline", href: "/", icon: "i-heroicons-clock" },
  { name: "Timer", href: "/timer", icon: "i-heroicons-play-circle" },
  { name: "Ta-Da!", href: "/tada", icon: "i-heroicons-bolt" },
  { name: "Journal", href: "/add", icon: "i-heroicons-book-open" },
  { name: "Rhythms", href: "/rhythms", icon: "i-heroicons-chart-bar" },
];

const route = useRoute();
</script>

<template>
  <div class="min-h-screen bg-pearl-base dark:bg-cosmic-violet">
    <!-- Header -->
    <header
      class="sticky top-0 z-40 bg-pearl-cream/80 dark:bg-cosmic-void/80 backdrop-blur-sm border-b border-text-light-muted/20 dark:border-text-dark-muted/20"
    >
      <div
        class="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between"
      >
        <NuxtLink
          to="/"
          class="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src="/icons/tada-logotype.png" alt="TA-DA" class="h-16 w-auto" />
        </NuxtLink>

        <!-- Desktop nav -->
        <nav class="hidden sm:flex items-center gap-1">
          <NuxtLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="
              route.path === item.href ||
              (item.href === '/tada' &&
                route.path === '/add' &&
                route.query['type'] === 'tada')
                ? 'bg-gold-highlight/30 text-gold-light dark:bg-gold-dark/20 dark:text-gold-dark'
                : 'text-text-light-secondary hover:bg-pearl-mist dark:text-text-dark-secondary dark:hover:bg-cosmic-indigo'
            "
          >
            {{ item.name }}
          </NuxtLink>
        </nav>

        <!-- Settings button -->
        <NuxtLink
          to="/settings"
          class="p-2 rounded-lg text-text-light-muted hover:bg-pearl-mist dark:text-text-dark-muted dark:hover:bg-cosmic-indigo transition-colors"
          aria-label="Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </NuxtLink>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-6">
      <slot />
    </main>

    <!-- Mobile bottom nav -->
    <nav
      class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-pearl-cream/90 dark:bg-cosmic-void/90 backdrop-blur-sm border-t border-text-light-muted/20 dark:border-text-dark-muted/20 safe-area-bottom"
    >
      <div class="grid grid-cols-5 h-16">
        <NuxtLink
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          class="flex flex-col items-center justify-center gap-1 transition-colors"
          :class="
            route.path === item.href ||
            (item.href === '/tada' &&
              route.path === '/add' &&
              route.query['type'] === 'tada')
              ? 'text-gold-light dark:text-gold-dark'
              : 'text-text-light-muted dark:text-text-dark-muted'
          "
        >
          <svg
            v-if="item.name === 'Timeline'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <svg
            v-else-if="item.name === 'Timer'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <svg
            v-else-if="item.name === 'Ta-Da!'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <svg
            v-else-if="item.name === 'Journal'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <svg
            v-else-if="item.name === 'Rhythms'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span class="text-xs font-medium">{{ item.name }}</span>
        </NuxtLink>
      </div>
    </nav>
    <ToastContainer />
    <ErrorTrackerPanel />
  </div>
</template>

<style>
/* Safe area for iOS devices with home indicator */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
