<script setup lang="ts">
import type { EntryMode } from "~/components/EntryTypeToggle.vue";

const navigation = [
  { name: "Timeline", href: "/", icon: "i-heroicons-clock" },
  { name: "Ta-Da!", href: "/tada", icon: "i-heroicons-bolt" },
  { name: "Moments", href: "/moments", icon: "i-heroicons-sparkles" },
  { name: "Sessions", href: "/sessions", icon: "i-heroicons-play-circle" },
  { name: "Tally", href: "/tally", icon: "i-heroicons-hashtag" },
  { name: "Rhythms", href: "/rhythms", icon: "i-heroicons-chart-bar" },
];

const route = useRoute();
const { triggerRefresh } = useTimelineRefresh();

// Quick entry modal state
const showQuickEntryModal = ref(false);
const quickEntryMode = ref<EntryMode>("timed");

// Handle entry saved - close modal and refresh timeline
function handleEntrySaved() {
  showQuickEntryModal.value = false;
  triggerRefresh();
}

// Keyboard shortcuts for quick entry
function handleKeydown(event: KeyboardEvent) {
  // Ignore if user is typing in an input/textarea
  const target = event.target as HTMLElement;
  if (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  ) {
    return;
  }

  // Cmd/Ctrl + N: Open quick entry (timed mode)
  if ((event.metaKey || event.ctrlKey) && event.key === "n") {
    event.preventDefault();
    quickEntryMode.value = "timed";
    showQuickEntryModal.value = true;
    return;
  }

  // Cmd/Ctrl + Shift + N: Open quick entry (moment mode)
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === "N") {
    event.preventDefault();
    quickEntryMode.value = "moment";
    showQuickEntryModal.value = true;
    return;
  }

  // "n" key alone: Open quick entry (when not in input)
  if (event.key === "n" && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    quickEntryMode.value = "timed";
    showQuickEntryModal.value = true;
    return;
  }

  // "m" key alone: Open moment capture
  if (event.key === "m" && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    quickEntryMode.value = "moment";
    showQuickEntryModal.value = true;
    return;
  }
}

// Add keyboard listener on mount
onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
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
              route.path === item.href
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
      <div class="grid grid-cols-6 h-16">
        <NuxtLink
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          class="flex flex-col items-center justify-center gap-0.5 transition-colors"
          :class="
            route.path === item.href
              ? 'text-gold-light dark:text-gold-dark'
              : 'text-text-light-muted dark:text-text-dark-muted'
          "
        >
          <svg
            v-if="item.name === 'Timeline'"
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <svg
            v-else-if="item.name === 'Sessions'"
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
            class="h-5 w-5"
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
            v-else-if="item.name === 'Tally'"
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
              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
            />
          </svg>
          <svg
            v-else-if="item.name === 'Moments'"
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
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <svg
            v-else-if="item.name === 'Rhythms'"
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span class="text-[10px] font-medium truncate">{{ item.name }}</span>
        </NuxtLink>
      </div>
    </nav>

    <!-- Quick Entry FAB (Floating Action Button) -->
    <button
      type="button"
      class="fixed right-4 bottom-20 sm:bottom-6 z-50 w-14 h-14 rounded-full bg-tada-600 hover:bg-tada-700 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center"
      title="Quick Add Entry"
      aria-label="Quick add entry"
      @click="showQuickEntryModal = true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
    </button>

    <!-- Quick Entry Modal -->
    <QuickEntryModal
      v-model:open="showQuickEntryModal"
      :initial-mode="quickEntryMode"
      @saved="handleEntrySaved"
    />

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
