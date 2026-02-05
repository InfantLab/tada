<script setup lang="ts">
/**
 * SettingsHint - First-time settings page guidance
 *
 * A gentle, dismissible hint that helps users understand
 * the key sections of the settings page.
 */

const { shouldShowSettingsHint, dismissSettingsHint } = useOnboarding();

const sections = [
  { icon: "⏱️", label: "Sessions", description: "Presets and capture options" },
  { icon: "⚡", label: "Features", description: "Categories, sounds, and entry types" },
  { icon: "🎤", label: "Voice & AI", description: "Speech and processing settings" },
  { icon: "💾", label: "Data", description: "Export and import your entries" },
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
      v-if="shouldShowSettingsHint"
      class="mb-6 p-4 bg-gradient-to-r from-tada-50 to-amber-50 dark:from-tada-900/20 dark:to-amber-900/20 border border-tada-200 dark:border-tada-700/50 rounded-xl"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2">
            Welcome to Settings
          </h3>
          <p class="text-sm text-stone-600 dark:text-stone-400 mb-3">
            Here you can customize Ta-Da! to fit your style. Here are the key areas:
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div
              v-for="section in sections"
              :key="section.label"
              class="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400"
            >
              <span>{{ section.icon }}</span>
              <span class="font-medium">{{ section.label }}</span>
            </div>
          </div>
        </div>
        <button
          class="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
          title="Dismiss"
          @click="dismissSettingsHint"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>
