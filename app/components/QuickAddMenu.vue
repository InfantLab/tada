<script setup lang="ts">
import type { EntryMode } from "./EntryTypeToggle.vue";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "select", mode: EntryMode): void;
  (e: "close"): void;
}>();

interface MenuOption {
  mode?: EntryMode;
  route?: string;
  label: string;
  icon: string;
  description: string;
  color: string;
}

const options: MenuOption[] = [
  {
    route: "/tada",
    label: "Ta-Da!",
    icon: "⚡",
    description: "Celebrate an accomplishment",
    color: "bg-amber-500 hover:bg-amber-600",
  },
  {
    route: "/moments",
    label: "Moment",
    icon: "✨",
    description: "Quick note or reflection",
    color: "bg-purple-500 hover:bg-purple-600",
  },
  {
    route: "/sessions",
    label: "Session",
    icon: "⏱️",
    description: "Start a timer",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    route: "/tally",
    label: "Tally",
    icon: "📊",
    description: "Track reps or counts",
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    mode: "timed",
    label: "Past Entry",
    icon: "🕐",
    description: "Log a past activity",
    color: "bg-stone-500 hover:bg-stone-600",
  },
];

function selectOption(option: MenuOption) {
  if (option.route) {
    // Navigate to the route and close the menu
    navigateTo(option.route);
    close();
  } else if (option.mode) {
    // Emit the mode to open the modal
    emit("select", option.mode);
  }
}

function close() {
  emit("close");
}

// Close on escape key
function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    close();
  }
}
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
        class="fixed inset-0 bg-black/20 z-40"
        @click="close"
      />
    </Transition>

    <!-- Menu -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >
      <div
        v-if="open"
        class="fixed right-4 bottom-36 sm:bottom-24 z-50 w-72"
        @keydown="handleKeydown"
      >
        <div
          class="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden"
        >
          <!-- Header -->
          <div
            class="px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50"
          >
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-stone-800 dark:text-stone-100">
                Quick Add
              </h3>
              <button
                type="button"
                class="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                @click="close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Options -->
          <div class="p-2">
            <button
              v-for="(option, index) in options"
              :key="option.mode || option.route || index"
              type="button"
              class="w-full flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors text-left"
              @click="selectOption(option)"
            >
              <div
                class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                :class="option.color"
              >
                {{ option.icon }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-stone-800 dark:text-stone-100">
                  {{ option.label }}
                </div>
                <div class="text-xs text-stone-500 dark:text-stone-400">
                  {{ option.description }}
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-stone-300 dark:text-stone-600 flex-shrink-0 mt-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
