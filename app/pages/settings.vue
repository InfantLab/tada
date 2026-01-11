<script setup lang="ts">
// Settings page

definePageMeta({
  layout: "default",
});

// App version
const appVersion = "0.1.0";
const appName = "Tada";

// User preferences
const settings = ref({
  theme: "system" as "light" | "dark" | "system",
  defaultTimerMinutes: 10,
  bellSound: "tibetan-bowl",
  notifications: true,
  timezone: "UTC",
});

const isSaving = ref(false);
const isExporting = ref(false);
const isLoggingOut = ref(false);

// User info
const currentUser = ref<{
  id: string;
  username: string;
  timezone: string;
} | null>(null);

// Fetch current user
onMounted(async () => {
  try {
    const session = await $fetch("/api/auth/session");
    if (session.user) {
      currentUser.value = session.user;
    }
  } catch (error) {
    console.error("Failed to fetch user info:", error);
  }
});

// Logout function
async function logout() {
  if (!confirm("Are you sure you want to log out?")) {
    return;
  }

  isLoggingOut.value = true;
  try {
    await $fetch("/api/auth/logout", { method: "POST" });
    navigateTo("/login");
  } catch (error: unknown) {
    console.error("Logout failed:", error);
    alert("Failed to log out. Please try again.");
  } finally {
    isLoggingOut.value = false;
  }
}

// Available bell sounds
const bellSounds = [
  { id: "tibetan-bowl", name: "Tibetan Bowl" },
  { id: "meditation-bell", name: "Meditation Bell" },
  { id: "crystal-singing", name: "Crystal Singing Bowl" },
  { id: "soft-gong", name: "Soft Gong" },
];

// Theme options
const themes = [
  { id: "light", name: "Light", icon: "☀️" },
  { id: "dark", name: "Dark", icon: "🌙" },
  { id: "system", name: "System", icon: "💻" },
];

// Timezone detection and load settings
onMounted(() => {
  settings.value.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Load settings from localStorage
  try {
    const saved = localStorage.getItem("tada-settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      settings.value = { ...settings.value, ...parsed };
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
});

async function saveSettings() {
  isSaving.value = true;
  try {
    // Save to localStorage for now (Phase 2: save to user profile)
    localStorage.setItem("tada-settings", JSON.stringify(settings.value));
    console.log("Settings saved");
  } catch (error) {
    console.error("Failed to save settings:", error);
  } finally {
    isSaving.value = false;
  }
}

async function exportData() {
  isExporting.value = true;
  try {
    // Fetch all entries
    const entries = await $fetch("/api/entries", {
      params: { limit: 10000 },
    });

    // Create JSON export
    const exportData = {
      version: appVersion,
      exportedAt: new Date().toISOString(),
      entries,
    };

    // Download as JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tada-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error: unknown) {
    console.error("Export failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    alert(`Export failed: ${message}`);
  } finally {
    isExporting.value = false;
  }
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
        <svg
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </NuxtLink>
      <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
        Settings
      </h1>
    </div>

    <div class="space-y-8">
      <!-- Account -->
      <section v-if="currentUser">
        <h2
          class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4"
        >
          Account
        </h2>
        <div
          class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700"
        >
          <!-- User info -->
          <div class="p-4">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-tada-100 dark:bg-tada-900/30 flex items-center justify-center"
              >
                <span class="text-xl">👤</span>
              </div>
              <div>
                <p class="font-medium text-stone-800 dark:text-stone-100">
                  {{ currentUser.username }}
                </p>
                <p class="text-sm text-stone-500 dark:text-stone-400">
                  {{ currentUser.timezone }}
                </p>
              </div>
            </div>
          </div>

          <!-- Logout -->
          <button
            :disabled="isLoggingOut"
            class="w-full p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
            @click="logout"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">🚪</span>
              <span
                class="text-sm font-medium text-stone-700 dark:text-stone-300"
              >
                {{ isLoggingOut ? "Logging out..." : "Log out" }}
              </span>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-stone-400"
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
      </section>

      <!-- Appearance -->
      <section>
        <h2
          class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4"
        >
          Appearance
        </h2>
        <div
          class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden"
        >
          <div class="p-4">
            <label
              class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-3"
            >
              Theme
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="theme in themes"
                :key="theme.id"
                class="flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors"
                :class="
                  settings.theme === theme.id
                    ? 'border-tada-500 bg-tada-50 dark:bg-tada-900/20'
                    : 'border-stone-200 dark:border-stone-600 hover:border-stone-300'
                "
                @click="settings.theme = theme.id as any"
              >
                <span class="text-xl">{{ theme.icon }}</span>
                <span class="text-sm text-stone-600 dark:text-stone-300">{{
                  theme.name
                }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Timer -->
      <section>
        <h2
          class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4"
        >
          Timer
        </h2>
        <div
          class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700"
        >
          <!-- Default duration -->
          <div class="p-4">
            <div class="flex items-center justify-between">
              <label
                class="text-sm font-medium text-stone-700 dark:text-stone-300"
              >
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
              <label
                class="text-sm font-medium text-stone-700 dark:text-stone-300"
              >
                Bell sound
              </label>
              <select
                v-model="settings.bellSound"
                class="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100"
              >
                <option
                  v-for="bell in bellSounds"
                  :key="bell.id"
                  :value="bell.id"
                >
                  {{ bell.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- Notifications -->
      <section>
        <h2
          class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4"
        >
          Notifications
        </h2>
        <div
          class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
        >
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <label
                  class="text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Push notifications
                </label>
                <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Reminders for habits and timer completion
                </p>
              </div>
              <button
                type="button"
                class="relative w-12 h-7 rounded-full transition-colors"
                :class="
                  settings.notifications
                    ? 'bg-tada-500'
                    : 'bg-stone-300 dark:bg-stone-600'
                "
                role="switch"
                :aria-checked="settings.notifications"
                aria-label="Toggle push notifications"
                @click="settings.notifications = !settings.notifications"
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
        <h2
          class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4"
        >
          Data
        </h2>
        <div
          class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700"
        >
          <!-- Export -->
          <button
            :disabled="isExporting"
            class="w-full p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="exportData"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">📦</span>
              <div class="text-left">
                <span
                  class="block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  {{ isExporting ? "Exporting..." : "Export data" }}
                </span>
                <span class="text-xs text-stone-500 dark:text-stone-400">
                  Download all your entries as JSON
                </span>
              </div>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-stone-400"
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

          <!-- Import (Phase 2) -->
          <button
            disabled
            class="w-full p-4 flex items-center justify-between opacity-50 cursor-not-allowed"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">📥</span>
              <div class="text-left">
                <span
                  class="block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Import data
                </span>
                <span class="text-xs text-stone-500 dark:text-stone-400">
                  Coming in v0.2.0
                </span>
              </div>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-stone-400"
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
      </section>

      <!-- About -->
      <section>
        <h2
          class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4"
        >
          About
        </h2>
        <div
          class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4"
        >
          <!-- Logotype -->
          <div class="flex justify-center mb-4">
            <img
              src="/icons/tada-logotype.png"
              alt="TA-DA"
              class="h-16 w-auto"
            >
          </div>
          <div class="flex items-start gap-3">
            <span class="text-3xl">⚡</span>
            <div>
              <h3 class="font-semibold text-stone-800 dark:text-stone-100">
                {{ appName }}
                <span class="text-sm font-normal text-stone-500"
                  >v{{ appVersion }}</span
                >
              </h3>
              <p class="text-sm text-stone-600 dark:text-stone-300 mt-1">
                Track Activities, Discover Achievements
              </p>
              <p class="text-xs text-stone-500 dark:text-stone-400 mt-2">
                Open source personal lifelogger. Your data belongs to you.
              </p>
              <div class="flex gap-3 mt-3">
                <a
                  href="https://github.com/InfantLab/tada"
                  target="_blank"
                  class="text-xs text-tada-600 dark:text-tada-400 hover:underline"
                >
                  GitHub
                </a>
                <a
                  href="/docs/DEVELOPER_GUIDE.md"
                  target="_blank"
                  class="text-xs text-tada-600 dark:text-tada-400 hover:underline"
                >
                  Docs
                </a>
                <a
                  href="https://github.com/InfantLab/tada/blob/main/LICENSE"
                  target="_blank"
                  class="text-xs text-tada-600 dark:text-tada-400 hover:underline"
                >
                  License (AGPL-3.0)
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Save button -->
      <button
        :disabled="isSaving"
        class="w-full py-3 bg-tada-600 hover:bg-tada-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        @click="saveSettings"
      >
        {{ isSaving ? "Saving..." : "Save Settings" }}
      </button>
    </div>
  </div>
</template>
