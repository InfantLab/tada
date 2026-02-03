<script setup lang="ts">
/**
 * ContextualHelpPanel - Slide-in help panel with page-specific content
 *
 * Shows contextual help for the current page when the user clicks the ? icon.
 * Answers the "why" behind features, not just "how" — matching Ta-Da!'s philosophy.
 */

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const route = useRoute();

// Page-specific help content
interface HelpSection {
  title: string;
  icon: string;
  content: string;
  tip?: string;
}

interface PageHelp {
  title: string;
  description: string;
  sections: HelpSection[];
}

const helpContent: Record<string, PageHelp> = {
  "/": {
    title: "Your Timeline",
    description:
      "Everything you've captured, in one place. Your timeline is a celebration of what you've done, not a to-do list of what's left.",
    sections: [
      {
        title: "Why count up?",
        icon: "⬆️",
        content:
          "Traditional timers count down, creating pressure. Ta-Da! counts up — celebrating what you accomplished rather than what's remaining.",
      },
      {
        title: "Quick capture",
        icon: "➕",
        content:
          "Tap the + button to quickly log sessions, moments, or wins. Keyboard shortcuts: 'n' for new entry, 'm' for moment.",
      },
      {
        title: "Finding entries",
        icon: "🔍",
        content:
          "Use the search icon to find specific entries. Filter by category using the emoji chips, or change the time range.",
      },
    ],
  },
  "/sessions": {
    title: "Sessions",
    description:
      "Timed practices like meditation, focused work, or creative flow. The timer celebrates what you did, not what's left.",
    sections: [
      {
        title: "Why timers count up",
        icon: "⏱️",
        content:
          "When you meditate for 47 minutes, the celebration is 'You did 47 minutes!' not 'You have 13 minutes left.' This philosophy extends throughout Ta-Da!",
      },
      {
        title: "Interval bells",
        icon: "🔔",
        content:
          "Optional bells mark time without interrupting flow. Set a gentle chime every 10 minutes, or practice in silence — it's your choice.",
      },
      {
        title: "Background tabs",
        icon: "📱",
        content:
          "Browsers throttle background tabs to save battery. For the most accurate bell timing, keep Ta-Da! in the foreground during sessions.",
        tip: "Consider using 'Do Not Disturb' mode on your device for uninterrupted practice.",
      },
      {
        title: "Practice links",
        icon: "🔗",
        content:
          "Connect sessions to specific practices or guided content. Ta-Da! auto-detects YouTube, Insight Timer, and Spotify links.",
      },
    ],
  },
  "/tada": {
    title: "Ta-Da! Wins",
    description:
      "Celebrate accomplishments, big and small. Every win matters — noticing them builds a sense of progress and capability.",
    sections: [
      {
        title: "Why celebrate small wins?",
        icon: "🎉",
        content:
          "Research shows that acknowledging small accomplishments builds momentum and motivation. Ta-Da! helps you notice what you're doing right.",
      },
      {
        title: "Categories",
        icon: "📂",
        content:
          "Wins span all of life — work, health, creative projects, social connections. Use categories to see patterns in where you're thriving.",
      },
      {
        title: "Building identity",
        icon: "🌱",
        content:
          "Regular wins in an area build identity: 'I'm someone who finishes projects' or 'I take care of my health.' This is more powerful than tracking streaks.",
      },
    ],
  },
  "/moments": {
    title: "Moments",
    description:
      "Dreams, reflections, ideas, and magic. These quiet captures become treasures worth revisiting.",
    sections: [
      {
        title: "Dreams",
        icon: "💭",
        content:
          "Capture dreams right after waking. They fade quickly, but even fragments can reveal patterns and insights over time.",
      },
      {
        title: "Magic moments",
        icon: "🪄",
        content:
          "Life's delightful surprises — joy, serendipity, wonder, gratitude. Noticing magic amplifies it.",
      },
      {
        title: "Voice capture",
        icon: "🎙️",
        content:
          "Use voice input to quickly capture thoughts without typing. Ta-Da! structures your words into entries.",
      },
    ],
  },
  "/tally": {
    title: "Tally",
    description:
      "Quick counts for exercises, habits, or anything you want to track numerically. Simple and friction-free.",
    sections: [
      {
        title: "Presets",
        icon: "⚡",
        content:
          "Create presets for activities you track regularly. One tap to log 10 push-ups or a glass of water.",
      },
      {
        title: "Voice tallies",
        icon: "🎙️",
        content:
          "Say '10 push-ups, 12 kettlebells, 30 squats' and Ta-Da! creates multiple tally entries at once.",
      },
    ],
  },
  "/rhythms": {
    title: "Rhythms",
    description:
      "Your patterns over time. Graceful chains celebrate consistency while acknowledging that life happens.",
    sections: [
      {
        title: "Graceful chains",
        icon: "🔗",
        content:
          "Traditional streaks punish you for missing a single day. Our chains celebrate consistency while forgiving the occasional gap.",
      },
      {
        title: "What if I miss a day?",
        icon: "📅",
        content:
          "Nothing dramatic! Your rhythm continues. Missing a day doesn't break your identity as a meditator — it's just one day.",
      },
      {
        title: "Journey stages",
        icon: "🛤️",
        content:
          "Starting (0-10h), Building (10-100h), Becoming (100-1000h), Being (1000h+). These celebrate depth over speed.",
      },
      {
        title: "Chain types",
        icon: "📊",
        content:
          "Daily, weekly, or monthly targets. Choose what works for your practice — 3 days a week is just as valid as daily.",
      },
    ],
  },
  "/settings": {
    title: "Settings",
    description: "Customize Ta-Da! to match how you want to live and practice.",
    sections: [
      {
        title: "Categories",
        icon: "📁",
        content:
          "Hide categories you don't use. Customize emojis to make categories feel like yours.",
      },
      {
        title: "Timer presets",
        icon: "⏱️",
        content:
          "Save your favorite timer configurations for quick access. Name them meaningfully: 'Morning Sit', 'Pomodoro', etc.",
      },
      {
        title: "Data export",
        icon: "📦",
        content:
          "Export all your data anytime in JSON format. Your data is yours — no lock-in.",
      },
      {
        title: "Import",
        icon: "📥",
        content:
          "Import from Insight Timer, Strava, or any CSV. Create custom recipes for apps you use regularly.",
      },
    ],
  },
};

// Get help for current page, with fallback to home
const currentHelp = computed(() => {
  const path = route.path;
  return helpContent[path] || helpContent["/"];
});

function close() {
  emit("update:open", false);
}

// Close on escape key
function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.open) {
    close();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
        @click="close"
      />
    </Transition>

    <!-- Panel -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="open"
        class="fixed right-0 top-0 bottom-0 w-full max-w-md bg-pearl-cream dark:bg-cosmic-void border-l border-stone-200 dark:border-stone-700 z-50 overflow-y-auto"
      >
        <!-- Header -->
        <div class="sticky top-0 bg-pearl-cream/95 dark:bg-cosmic-void/95 backdrop-blur-sm border-b border-stone-200 dark:border-stone-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100">
              {{ currentHelp.title }}
            </h2>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              Quick help for this page
            </p>
          </div>
          <button
            type="button"
            class="p-2 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close help"
            @click="close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
          <!-- Page description -->
          <p class="text-stone-600 dark:text-stone-300 leading-relaxed">
            {{ currentHelp.description }}
          </p>

          <!-- Help sections -->
          <div class="space-y-4">
            <div
              v-for="section in currentHelp.sections"
              :key="section.title"
              class="bg-white dark:bg-stone-800 rounded-xl p-4 border border-stone-200 dark:border-stone-700"
            >
              <div class="flex items-start gap-3">
                <span class="text-xl flex-shrink-0">{{ section.icon }}</span>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-stone-800 dark:text-stone-100 mb-1">
                    {{ section.title }}
                  </h3>
                  <p class="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                    {{ section.content }}
                  </p>
                  <p
                    v-if="section.tip"
                    class="mt-2 text-sm text-tada-600 dark:text-tada-400 flex items-start gap-1"
                  >
                    <span class="flex-shrink-0">💡</span>
                    <span>{{ section.tip }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer links -->
          <div class="pt-4 border-t border-stone-200 dark:border-stone-700 space-y-3">
            <NuxtLink
              to="/help"
              class="flex items-center gap-2 text-tada-600 dark:text-tada-400 hover:underline"
              @click="close"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View full FAQ
            </NuxtLink>
            <NuxtLink
              to="/feedback"
              class="flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              @click="close"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Send feedback
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
