<script setup lang="ts">
// Settings page

definePageMeta({
  layout: 'default',
})

// User preferences
const settings = ref({
  theme: 'system' as 'light' | 'dark' | 'system',
  defaultTimerMinutes: 10,
  bellSound: 'tibetan-bowl',
  notifications: true,
})

// Available bell sounds
const bellSounds = [
  { id: 'tibetan-bowl', name: 'Tibetan Bowl' },
  { id: 'meditation-bell', name: 'Meditation Bell' },
  { id: 'crystal-singing', name: 'Crystal Singing Bowl' },
  { id: 'soft-gong', name: 'Soft Gong' },
]

// Theme options
const themes = [
  { id: 'light', name: 'Light', icon: '☀️' },
  { id: 'dark', name: 'Dark', icon: '🌙' },
  { id: 'system', name: 'System', icon: '💻' },
]

async function saveSettings() {
  // TODO: Save to API / localStorage
  console.log('Saving settings:', settings.value)
}

async function exportData() {
  // TODO: Implement data export
  console.log('Exporting data...')
}

async function logout() {
  // TODO: Implement logout
  navigateTo('/login')
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Page header -->
    <div class="flex items-center gap-4 mb-6">
      <NuxtLink 
        to="/"
        class="p-2 -ml-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </NuxtLink>
      <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">Settings</h1>
    </div>

    <div class="space-y-8">
      <!-- Appearance -->
      <section>
        <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Appearance</h2>
        <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div class="p-4">
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">
              Theme
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="theme in themes"
                :key="theme.id"
                @click="settings.theme = theme.id as any"
                class="flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors"
                :class="settings.theme === theme.id 
                  ? 'border-tada-500 bg-tada-50 dark:bg-tada-900/20' 
                  : 'border-stone-200 dark:border-stone-600 hover:border-stone-300'"
              >
                <span class="text-xl">{{ theme.icon }}</span>
                <span class="text-sm text-stone-600 dark:text-stone-300">{{ theme.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Timer -->
      <section>
        <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Timer</h2>
        <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700">
          <!-- Default duration -->
          <div class="p-4">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-stone-700 dark:text-stone-300">
                Default duration
              </label>
              <select 
                v-model.number="settings.defaultTimerMinutes"
                class="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100"
              >
                <option :value="5">5 minutes</option>
                <option :value="10">10 minutes</option>
                <option :value="15">15 minutes</option>
                <option :value="20">20 minutes</option>
                <option :value="30">30 minutes</option>
                <option :value="45">45 minutes</option>
                <option :value="60">60 minutes</option>
              </select>
            </div>
          </div>

          <!-- Bell sound -->
          <div class="p-4">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-stone-700 dark:text-stone-300">
                Bell sound
              </label>
              <select 
                v-model="settings.bellSound"
                class="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100"
              >
                <option v-for="bell in bellSounds" :key="bell.id" :value="bell.id">
                  {{ bell.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- Notifications -->
      <section>
        <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Notifications</h2>
        <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Push notifications
                </label>
                <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Reminders for habits and timer completion
                </p>
              </div>
              <button
                type="button"
                @click="settings.notifications = !settings.notifications"
                class="relative w-12 h-7 rounded-full transition-colors"
                :class="settings.notifications ? 'bg-tada-500' : 'bg-stone-300 dark:bg-stone-600'"
                role="switch"
                :aria-checked="settings.notifications"
                aria-label="Toggle push notifications"
              >
                <span 
                  class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform"
                  :class="settings.notifications ? 'translate-x-5' : ''"
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Data -->
      <section>
        <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Data</h2>
        <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700">
          <!-- Export -->
          <button
            @click="exportData"
            class="w-full p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">📦</span>
              <div class="text-left">
                <span class="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Export data
                </span>
                <span class="text-xs text-stone-500 dark:text-stone-400">
                  Download all your entries as JSON
                </span>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <!-- Import -->
          <button
            class="w-full p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">📥</span>
              <div class="text-left">
                <span class="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Import data
                </span>
                <span class="text-xs text-stone-500 dark:text-stone-400">
                  Import from Insight Timer, CSV, etc.
                </span>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      <!-- Account -->
      <section>
        <h2 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Account</h2>
        <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
          <button
            @click="logout"
            class="w-full p-4 flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span class="font-medium">Log out</span>
          </button>
        </div>
      </section>

      <!-- App info -->
      <div class="text-center text-sm text-stone-400 dark:text-stone-500 py-4">
        <p>Tada v0.1.0</p>
        <p class="mt-1">Made with 🎉 for life's moments</p>
      </div>
    </div>
  </div>
</template>
