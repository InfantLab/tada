<script setup lang="ts">
// Settings page
import {
  CATEGORY_DEFAULTS,
  getSubcategoriesForCategory,
  getCategoryEmoji,
  getSubcategoryEmoji,
} from "~/utils/categoryDefaults";
import type { Entry } from "~/server/db/schema";

const { success: showSuccess, error: showError } = useToast();

definePageMeta({
  layout: "default",
});

// Runtime config
const config = useRuntimeConfig();
const isCloudMode = config.public.isCloudMode;

// App version - fetched dynamically
const appVersion = ref("0.3.1");
const gitHash = ref("");
const appName = "Tada";

// Fetch version info on mount
onMounted(async () => {
  try {
    const versionInfo = await $fetch("/api/version");
    appVersion.value = versionInfo.version;
    gitHash.value = versionInfo.gitShortHash;
  } catch (error) {
    console.error("Failed to fetch version info:", error);
  }
});

// User preferences
const settings = ref({
  theme: "system" as "light" | "dark" | "system",
  notifications: true,
  timezone: "UTC",
  captureMood: true,
  captureReflection: true,
  tadaSound: "tada-short" as "tada-long" | "tada-short" | "twinkle",
});

const isSaving = ref(false);
const isExporting = ref(false);
const isLoggingOut = ref(false);

// Delete Category Data modal
const showDeleteCategoryModal = ref(false);
const selectedDeleteCategory = ref<string | null>(null);
const deleteCategoryCount = ref(0);
const isDeletingCategory = ref(false);
const deletedCategoryEntries = ref<unknown[]>([]); // For undo support

// Timer Presets
interface TimerPreset {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  durationSeconds: number | null;
  bellConfig: {
    startBell?: string;
    endBell?: string;
    intervalBells?: Array<{ minutes: number; sound: string }>;
  } | null;
  backgroundAudio: string | null;
  isDefault: boolean;
  createdAt: string;
}

const presets = ref<TimerPreset[]>([]);
const isLoadingPresets = ref(false);
const isDeletingPreset = ref<string | null>(null);
const editingPreset = ref<TimerPreset | null>(null);
const editPresetName = ref("");

// Fetch timer presets
async function fetchPresets() {
  isLoadingPresets.value = true;
  try {
    const data = await $fetch<TimerPreset[]>("/api/presets");
    presets.value = data;
  } catch (error) {
    console.error("Failed to fetch presets:", error);
    showError("Failed to load timer presets");
  } finally {
    isLoadingPresets.value = false;
  }
}

// Delete a preset
async function deletePreset(preset: TimerPreset) {
  if (!confirm(`Delete preset "${preset.name}"?`)) {
    return;
  }

  isDeletingPreset.value = preset.id;
  try {
    await $fetch<unknown>(`/api/presets/${preset.id}`, { method: "DELETE" });
    presets.value = presets.value.filter((p) => p.id !== preset.id);
    showSuccess(`Deleted "${preset.name}"`);
  } catch (error) {
    console.error("Failed to delete preset:", error);
    showError("Failed to delete preset");
  } finally {
    isDeletingPreset.value = null;
  }
}

// Start editing a preset
function startEditPreset(preset: TimerPreset) {
  editingPreset.value = preset;
  editPresetName.value = preset.name;
}

// Cancel editing
function cancelEditPreset() {
  editingPreset.value = null;
  editPresetName.value = "";
}

// Save edited preset
async function saveEditPreset() {
  if (!editingPreset.value || !editPresetName.value.trim()) {
    return;
  }

  try {
    await $fetch<unknown>(`/api/presets/${editingPreset.value.id}`, {
      method: "PUT",
      body: { name: editPresetName.value.trim() },
    });

    // Update local state
    const index = presets.value.findIndex(
      (p) => p.id === editingPreset.value?.id,
    );
    const existingPreset = presets.value[index];
    if (index !== -1 && existingPreset) {
      presets.value[index] = {
        ...existingPreset,
        name: editPresetName.value.trim(),
      };
    }

    showSuccess("Preset updated");
    cancelEditPreset();
  } catch (error) {
    console.error("Failed to update preset:", error);
    showError("Failed to update preset");
  }
}

// Format duration for display
function formatDuration(seconds: number | null): string {
  if (!seconds) return "Unlimited";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} min`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Get interval info for preset display
function getPresetIntervalInfo(preset: TimerPreset): string {
  const bells = preset.bellConfig?.intervalBells;
  if (!bells || bells.length === 0) return "";

  const firstInterval = bells[0];
  if (!firstInterval || !firstInterval.minutes) return "";

  return `${firstInterval.minutes}m bells`;
}

// User preferences composable
const {
  preferences: userPrefs,
  loadPreferences: loadUserPrefs,
  setCustomEmoji,
  getCustomEmoji,
  isEntryTypeVisible,
  hideEntryType,
  showEntryType,
  addCustomEntryType,
  removeCustomEntryType,
  isCategoryVisible,
  hideCategory,
  showCategory,
} = usePreferences();

// Emoji customization
const showEmojiPicker = ref(false);
const emojiPickerTarget = ref<{
  type: "category" | "subcategory" | "customType";
  key: string;
  name: string;
} | null>(null);

// Category visibility toggle
async function toggleCategoryVisibility(category: string) {
  if (isCategoryVisible(category)) {
    await hideCategory(category);
    showSuccess(`Hidden "${category}" from pickers`);
  } else {
    await showCategory(category);
    showSuccess(`Showing "${category}" in pickers`);
  }
}

// Entry type management
const builtInEntryTypes = [
  {
    value: "tada",
    label: "Ta-Da!",
    emoji: "⚡",
    description: "Celebrate an accomplishment",
  },
  {
    value: "dream",
    label: "Dream",
    emoji: "🌙",
    description: "Record a dream",
  },
  {
    value: "note",
    label: "Note",
    emoji: "📝",
    description: "Capture a thought",
  },
  {
    value: "journal",
    label: "Journal",
    emoji: "💭",
    description: "Write a journal entry",
  },
];

const customEntryTypes = computed(() => userPrefs.value.customEntryTypes);

const isAddingCustomType = ref(false);
const newCustomType = ref({ name: "", emoji: "😀" });

async function toggleEntryTypeVisibility(entryType: string) {
  if (isEntryTypeVisible(entryType)) {
    await hideEntryType(entryType);
    showSuccess(`Hidden "${entryType}" from journal`);
  } else {
    await showEntryType(entryType);
    showSuccess(`Showing "${entryType}" in journal`);
  }
}

async function addCustomType() {
  if (!newCustomType.value.name.trim()) return;

  const success = await addCustomEntryType(
    newCustomType.value.name.trim(),
    newCustomType.value.emoji,
  );
  if (success) {
    showSuccess(`Added "${newCustomType.value.name}"`);
    newCustomType.value = { name: "", emoji: "😀" };
    isAddingCustomType.value = false;
  } else {
    showError("Failed to add custom type");
  }
}

function cancelAddCustomType() {
  newCustomType.value = { name: "", emoji: "😀" };
  isAddingCustomType.value = false;
}

async function removeCustomType(name: string) {
  if (!confirm(`Remove "${name}"?`)) return;

  const success = await removeCustomEntryType(name);
  if (success) {
    showSuccess(`Removed "${name}"`);
  } else {
    showError("Failed to remove custom type");
  }
}

function openCustomTypeEmojiPicker() {
  emojiPickerTarget.value = {
    type: "customType",
    key: "customType",
    name: "custom entry type",
  };
  showEmojiPicker.value = true;
}

// Get all categories and subcategories for customization
const allCategories = computed(() => {
  return Object.keys(CATEGORY_DEFAULTS);
});

const categoriesWithSubcategories = computed(() => {
  return allCategories.value.map((cat) => ({
    category: cat,
    emoji: getCustomEmoji(cat) || getCategoryEmoji(cat),
    subcategories: getSubcategoriesForCategory(cat).map((sub) => ({
      key: `${cat}:${sub.slug}`,
      name: sub.label,
      emoji:
        getCustomEmoji(`${cat}:${sub.slug}`) ||
        getSubcategoryEmoji(cat, sub.slug),
    })),
  }));
});

// Open emoji picker for a category or subcategory
function openEmojiPickerFor(
  type: "category" | "subcategory",
  key: string,
  name: string,
) {
  emojiPickerTarget.value = { type, key, name };
  showEmojiPicker.value = true;
}

// Handle emoji selection
async function handleEmojiSelected(emoji: string) {
  if (!emojiPickerTarget.value) return;

  // Handle custom type emoji selection
  if (emojiPickerTarget.value.type === "customType") {
    newCustomType.value.emoji = emoji;
    emojiPickerTarget.value = null;
    return;
  }

  const success = await setCustomEmoji(emojiPickerTarget.value.key, emoji);
  if (success) {
    showSuccess(`Updated emoji for ${emojiPickerTarget.value.name}`);
  } else {
    showError("Failed to update emoji");
  }

  emojiPickerTarget.value = null;
}

// User info
const currentUser = ref<{
  id: string;
  username: string;
  timezone: string;
  email?: string;
  emailVerified?: boolean;
} | null>(null);

// Password change state
const passwordForm = ref({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const isChangingPassword = ref(false);
const passwordError = ref<string | null>(null);
const passwordSuccess = ref(false);

// Email state
const emailForm = ref({
  email: "",
});
const _isUpdatingEmail = ref(false); // TODO: implement email update API
const emailError = ref<string | null>(null);
const emailSuccess = ref(false);

// Newsletter state
const newsletterSubscribed = ref(false);
const isSubscribingNewsletter = ref(false);
const newsletterError = ref<string | null>(null);

// Toggle newsletter subscription
async function toggleNewsletter() {
  if (!emailForm.value.email) {
    newsletterError.value = "Please enter an email address first";
    return;
  }

  newsletterError.value = null;
  isSubscribingNewsletter.value = true;

  try {
    if (!newsletterSubscribed.value) {
      // Subscribe
      await $fetch("/api/newsletter/subscribe", {
        method: "POST",
        body: {
          email: emailForm.value.email,
          source: "settings"
        },
      });
      newsletterSubscribed.value = true;
      showSuccess("Subscribed to newsletter!");
    } else {
      // Unsubscribe
      await $fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        body: { email: emailForm.value.email },
      });
      newsletterSubscribed.value = false;
      showSuccess("Unsubscribed from newsletter");
    }
  } catch (err) {
    console.error("Newsletter toggle failed:", err);
    newsletterError.value = "Failed to update newsletter preference";
  } finally {
    isSubscribingNewsletter.value = false;
  }
}

// Fetch current user
onMounted(async () => {
  try {
    const session = await $fetch<{
      user?: {
        id: string;
        username: string;
        timezone?: string;
        email?: string;
        emailVerified?: boolean;
      };
    }>("/api/auth/session");
    if (session.user) {
      currentUser.value = {
        id: session.user.id,
        username: session.user.username,
        timezone: session.user.timezone ?? "UTC",
        email: session.user.email ?? undefined,
        emailVerified: session.user.emailVerified ?? undefined,
      };
      // Pre-fill email form if user has email
      if (session.user.email) {
        emailForm.value.email = session.user.email;
      }
    }
    // Fetch timer presets and user preferences
    await Promise.all([fetchPresets(), loadUserPrefs()]);
  } catch (error) {
    console.error("Failed to fetch user info:", error);
  }
});

// Change password function
async function changePassword() {
  passwordError.value = null;
  passwordSuccess.value = false;

  if (!passwordForm.value.currentPassword) {
    passwordError.value = "Current password is required";
    return;
  }

  if (!passwordForm.value.newPassword) {
    passwordError.value = "New password is required";
    return;
  }

  if (passwordForm.value.newPassword.length < 6) {
    passwordError.value = "New password must be at least 6 characters";
    return;
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = "Passwords do not match";
    return;
  }

  isChangingPassword.value = true;

  try {
    await $fetch<unknown>("/api/auth/change-password", {
      method: "POST",
      body: {
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword,
      },
    });

    passwordSuccess.value = true;
    passwordForm.value = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
  } catch (err: unknown) {
    console.error("Password change failed:", err);
    if (err && typeof err === "object" && "data" in err) {
      const errorData = err.data as { statusMessage?: string };
      passwordError.value = errorData.statusMessage || "Password change failed";
    } else {
      passwordError.value = "Password change failed. Please try again.";
    }
  } finally {
    isChangingPassword.value = false;
  }
}

// Logout function
async function logout() {
  if (!confirm("Are you sure you want to log out?")) {
    return;
  }

  isLoggingOut.value = true;
  try {
    await $fetch<unknown>("/api/auth/logout", { method: "POST" });
    navigateTo("/login");
  } catch (error: unknown) {
    console.error("Logout failed:", error);
    showError("Failed to log out. Please try again.");
  } finally {
    isLoggingOut.value = false;
  }
}

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

// Track last save for autosave indicator
const lastSaved = ref<Date | null>(null);

async function saveSettings() {
  isSaving.value = true;
  try {
    // Save to localStorage for now (Phase 2: save to user profile)
    localStorage.setItem("tada-settings", JSON.stringify(settings.value));
    lastSaved.value = new Date();
    console.log("Settings saved");
  } catch (error) {
    console.error("Failed to save settings:", error);
    showError("Failed to save settings");
  } finally {
    isSaving.value = false;
  }
}

async function exportData() {
  isExporting.value = true;
  try {
    // Fetch all entries
    const response = await $fetch<{
      entries: Entry[];
      nextCursor: string | null;
      hasMore: boolean;
    }>("/api/entries", {
      params: { limit: 10000 },
    });

    // Create JSON export
    const exportData = {
      version: appVersion.value,
      exportedAt: new Date().toISOString(),
      entries: response.entries,
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
    showError(`Export failed: ${message}`);
  } finally {
    isExporting.value = false;
  }
}

// Delete Category Data functions
async function openDeleteCategoryModal() {
  showDeleteCategoryModal.value = true;
  selectedDeleteCategory.value = null;
  deleteCategoryCount.value = 0;
}

async function selectDeleteCategory(category: string) {
  selectedDeleteCategory.value = category;
  // Fetch count of entries in this category
  try {
    const data = await $fetch<{ entries: unknown[]; total: number }>(
      "/api/entries",
      {
        params: { limit: 1, category },
      },
    );
    deleteCategoryCount.value = data.total;
  } catch (error) {
    console.error("Failed to count entries:", error);
    deleteCategoryCount.value = 0;
  }
}

async function confirmDeleteCategory() {
  if (!selectedDeleteCategory.value || deleteCategoryCount.value === 0) return;

  isDeletingCategory.value = true;
  try {
    // Call bulk delete API
    const result = await $fetch<{
      success: boolean;
      deletedCount: number;
      entries: unknown[];
    }>("/api/entries/bulk", {
      method: "DELETE",
      body: {
        category: selectedDeleteCategory.value,
      },
    });

    if (result.success) {
      // Store for undo
      deletedCategoryEntries.value = result.entries;
      const count = result.deletedCount;
      const category = selectedDeleteCategory.value;

      showSuccess(`Deleted ${count} ${category} entries`, {
        duration: 15000,
        action: {
          label: "Undo",
          onClick: async () => {
            await restoreDeletedCategoryEntries();
          },
        },
      });

      showDeleteCategoryModal.value = false;
      selectedDeleteCategory.value = null;
      deleteCategoryCount.value = 0;
    }
  } catch (error) {
    console.error("Failed to delete entries:", error);
    showError("Failed to delete entries");
  } finally {
    isDeletingCategory.value = false;
  }
}

async function restoreDeletedCategoryEntries() {
  if (deletedCategoryEntries.value.length === 0) return;

  try {
    // Get IDs from deleted entries
    const ids = deletedCategoryEntries.value.map(
      (e: unknown) => (e as { id: string }).id,
    );

    await $fetch<unknown>("/api/entries/bulk", {
      method: "POST",
      body: { ids },
    });

    showSuccess(`Restored ${ids.length} entries`);
    deletedCategoryEntries.value = [];
  } catch (error) {
    console.error("Failed to restore entries:", error);
    showError("Failed to restore entries");
  }
}

function cancelDeleteCategory() {
  showDeleteCategoryModal.value = false;
  selectedDeleteCategory.value = null;
  deleteCategoryCount.value = 0;
}

// Ta-Da sound options
const tadaSoundOptions = [
  {
    value: "tada-short",
    label: "Ta-Da Short",
    description: "Quick celebratory fanfare",
    file: "/sounds/tada-f-versionD.mp3",
  },
  {
    value: "tada-long",
    label: "Ta-Da Long",
    description: "Extended triumphant fanfare",
    file: "/sounds/tada-f-versionA.mp3",
  },
  {
    value: "twinkle",
    label: "Twinkle",
    description: "Gentle refresh chime",
    file: "/sounds/twinkle.mp3",
  },
];

// Preview sound
function previewTadaSound(file: string) {
  try {
    const audio = new Audio(file);
    audio.volume = 0.7;
    audio.play().catch(() => {
      // Audio play failed
    });
  } catch {
    // Audio not supported
  }
}

// Sidebar navigation - consolidated from 11 to 7 sections
const sidebarNavItems = [
  { id: "account", label: "Account", icon: "👤" },
  { id: "security", label: "Security", icon: "🔒" },
  { id: "sessions", label: "Sessions", icon: "⏱️" },
  { id: "features", label: "Features", icon: "⚡" },
  { id: "voice", label: "Voice & AI", icon: "🎤" },
  { id: "appearance", label: "Appearance", icon: "🎨" },
  { id: "data", label: "Data", icon: "💾" },
];

const activeSection = ref("account");

function scrollToSection(sectionId: string) {
  activeSection.value = sectionId;
  const element = document.getElementById(`section-${sectionId}`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Intersection observer to update active section on scroll
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace("section-", "");
          activeSection.value = id;
        }
      });
    },
    { threshold: 0.3, rootMargin: "-80px 0px -60% 0px" },
  );

  // Observe all sections after a short delay to ensure DOM is ready
  setTimeout(() => {
    sidebarNavItems.forEach((item) => {
      const el = document.getElementById(`section-${item.id}`);
      if (el) observer.observe(el);
    });
  }, 100);
});
</script>

<template>
  <div class="max-w-5xl mx-auto">
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
      <div class="ml-auto">
        <HelpLink search="account password" label="Need help?" />
      </div>
    </div>

    <!-- Settings hint for first-time visitors -->
    <SettingsHint />

    <!-- Mobile navigation tabs -->
    <div class="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
      <div class="flex gap-2 pb-2 min-w-max">
        <button
          v-for="item in sidebarNavItems"
          :key="item.id"
          class="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
          :class="
            activeSection === item.id
              ? 'bg-tada-100 dark:bg-tada-600/30 text-tada-800 dark:text-tada-200'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
          "
          @click="scrollToSection(item.id)"
        >
          <span>{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>

    <!-- Main layout: sidebar + content -->
    <div class="flex gap-8">
      <!-- Desktop sidebar -->
      <aside class="hidden lg:block w-56 flex-shrink-0">
        <nav class="sticky top-24 space-y-1">
          <button
            v-for="item in sidebarNavItems"
            :key="item.id"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
            :class="
              activeSection === item.id
                ? 'bg-gradient-to-r from-tada-100 to-amber-100 dark:from-tada-600/30 dark:to-amber-600/20 text-tada-800 dark:text-tada-200 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            "
            @click="scrollToSection(item.id)"
          >
            <span class="text-lg">{{ item.icon }}</span>
            <span class="font-medium">{{ item.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- Content area -->
      <div class="flex-1 min-w-0 max-w-lg space-y-8">
        <!-- Account -->
        <section v-if="currentUser" id="section-account">
          <h2
            class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4"
          >
            Account
          </h2>

          <!-- Subscription Widget - shows tier, usage, upgrade CTA -->
          <SettingsSubscriptionWidget class="mb-4" />

          <div
            class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700"
          >
            <!-- User info -->
            <div class="p-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-full bg-tada-100/30 dark:bg-tada-600/20 flex items-center justify-center"
                >
                  <span class="text-xl">👤</span>
                </div>
                <div class="flex-1">
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

        <!-- Security -->
        <section v-if="currentUser" id="section-security">
          <h2
            class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4"
          >
            Security
          </h2>
          <div
            class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700"
          >
            <!-- Email (if available) -->
            <div class="p-4">
              <label
                class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
              >
                Email Address
              </label>
              <p class="text-xs text-stone-500 dark:text-stone-400 mb-3">
                Used for password recovery. Optional for self-hosted.
              </p>
              <div class="flex gap-2">
                <input
                  v-model="emailForm.email"
                  type="email"
                  placeholder="your@email.com"
                  class="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-tada-500"
                />
                <span
                  v-if="currentUser.emailVerified"
                  class="px-2 py-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1"
                >
                  ✓ Verified
                </span>
              </div>
              <p
                v-if="emailSuccess"
                class="mt-2 text-sm text-green-600 dark:text-green-400"
              >
                Email updated successfully
              </p>
              <p
                v-if="emailError"
                class="mt-2 text-sm text-red-600 dark:text-red-400"
              >
                {{ emailError }}
              </p>

              <!-- Newsletter subscription -->
              <div class="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="newsletterSubscribed"
                    :disabled="isSubscribingNewsletter || !emailForm.email"
                    class="mt-0.5 w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-tada-600 focus:ring-tada-500 disabled:opacity-50"
                    @change="toggleNewsletter"
                  />
                  <div>
                    <span class="text-sm font-medium text-stone-700 dark:text-stone-300">
                      Subscribe to Ta-Da! newsletter
                    </span>
                    <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Occasional updates on mindfulness and gentle progress. No spam, unsubscribe anytime.
                    </p>
                  </div>
                </label>
                <p
                  v-if="newsletterError"
                  class="mt-2 text-sm text-red-600 dark:text-red-400"
                >
                  {{ newsletterError }}
                </p>
              </div>
            </div>

            <!-- Change Password -->
            <div class="p-4">
              <label
                class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
              >
                Change Password
              </label>
              <div class="space-y-3">
                <input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  placeholder="Current password"
                  class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-tada-500"
                />
                <input
                  v-model="passwordForm.newPassword"
                  type="password"
                  placeholder="New password (min 6 characters)"
                  class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-tada-500"
                />
                <input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-tada-500"
                />
                <button
                  :disabled="isChangingPassword"
                  class="w-full py-2 px-4 bg-tada-600 hover:opacity-90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  @click="changePassword"
                >
                  {{ isChangingPassword ? "Changing..." : "Change Password" }}
                </button>
                <p
                  v-if="passwordSuccess"
                  class="text-sm text-green-600 dark:text-green-400"
                >
                  Password changed successfully
                </p>
                <p
                  v-if="passwordError"
                  class="text-sm text-red-600 dark:text-red-400"
                >
                  {{ passwordError }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Voice & AI Settings -->
        <section id="section-voice">
          <SettingsVoiceSettings />
        </section>

        <!-- Sessions (Timer settings + Presets) -->
        <section id="section-sessions">
          <h2
            class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4"
          >
            Sessions
          </h2>

          <!-- Session Capture Options -->
          <div
            class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700 mb-4"
          >
            <!-- Capture mood -->
            <div class="p-4">
              <div class="flex items-center justify-between">
                <div>
                  <label
                    class="text-sm font-medium text-stone-700 dark:text-stone-300"
                  >
                    Capture mood
                  </label>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Ask how you feel after each session
                  </p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    v-model="settings.captureMood"
                    type="checkbox"
                    class="sr-only peer"
                    @change="saveSettings"
                  />
                  <div
                    class="w-11 h-6 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:bg-tada-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                  />
                </label>
              </div>
            </div>

            <!-- Capture reflection -->
            <div class="p-4">
              <div class="flex items-center justify-between">
                <div>
                  <label
                    class="text-sm font-medium text-stone-700 dark:text-stone-300"
                  >
                    Capture reflection
                  </label>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Write notes after each session
                  </p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    v-model="settings.captureReflection"
                    type="checkbox"
                    class="sr-only peer"
                    @change="saveSettings"
                  />
                  <div
                    class="w-11 h-6 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:bg-tada-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                  />
                </label>
              </div>
            </div>
          </div>

          <!-- Session Presets -->
          <h3 class="text-sm font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
            Saved Presets
          </h3>
          <div
            class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
          >
            <!-- Loading state -->
            <div v-if="isLoadingPresets" class="p-4 text-center">
              <span class="text-sm text-stone-500 dark:text-stone-400"
                >Loading presets...</span
              >
            </div>

            <!-- Empty state -->
            <div v-else-if="presets.length === 0" class="p-6 text-center">
              <span class="text-3xl mb-2 block">⏱️</span>
              <p class="text-sm text-stone-600 dark:text-stone-400">
                No saved presets yet
              </p>
              <p class="text-xs text-stone-500 dark:text-stone-500 mt-1">
                Create presets from the Timer page
              </p>
            </div>

            <!-- Preset list -->
            <div v-else class="divide-y divide-stone-200 dark:divide-stone-700">
              <div v-for="preset in presets" :key="preset.id" class="p-4">
                <!-- Edit mode -->
                <div v-if="editingPreset?.id === preset.id" class="space-y-3">
                  <input
                    v-model="editPresetName"
                    type="text"
                    class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-tada-500"
                    placeholder="Preset name"
                    @keyup.enter="saveEditPreset"
                    @keyup.escape="cancelEditPreset"
                  />
                  <div class="flex gap-2">
                    <button
                      class="flex-1 py-2 px-3 bg-tada-600 text-white text-sm font-medium rounded-lg hover:opacity-90"
                      @click="saveEditPreset"
                    >
                      Save
                    </button>
                    <button
                      class="flex-1 py-2 px-3 bg-stone-200 dark:bg-stone-600 text-stone-700 dark:text-stone-200 text-sm font-medium rounded-lg hover:opacity-90"
                      @click="cancelEditPreset"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <!-- Display mode -->
                <div v-else class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span
                        class="font-medium text-stone-800 dark:text-stone-100 truncate"
                      >
                        {{ preset.name }}
                      </span>
                      <span
                        v-if="preset.isDefault"
                        class="text-xs px-1.5 py-0.5 bg-tada-100 dark:bg-tada-900/30 text-tada-700 dark:text-tada-300 rounded"
                      >
                        Default
                      </span>
                    </div>
                    <p
                      class="text-sm text-stone-500 dark:text-stone-400 mt-0.5"
                    >
                      {{ preset.category }} / {{ preset.subcategory }} ·
                      {{ formatDuration(preset.durationSeconds) }}
                      <span v-if="getPresetIntervalInfo(preset)">
                        · {{ getPresetIntervalInfo(preset) }}
                      </span>
                    </p>
                  </div>
                  <div class="flex items-center gap-1 ml-2">
                    <button
                      class="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
                      title="Edit preset"
                      @click="startEditPreset(preset)"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      :disabled="isDeletingPreset === preset.id"
                      class="p-2 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-50"
                      title="Delete preset"
                      @click="deletePreset(preset)"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Features (Categories, Entry Types, Sounds) -->
        <section id="section-features">
          <h2
            class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4"
          >
            Features
          </h2>

          <!-- Categories link -->
          <NuxtLink
            to="/settings/categories"
            class="block bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors mb-4"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-xl">📁</span>
                <div>
                  <span class="text-sm font-medium text-stone-700 dark:text-stone-300 block">
                    Manage Categories
                  </span>
                  <span class="text-xs text-stone-500 dark:text-stone-400">
                    Customize emojis, visibility, and add custom categories
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
            </div>
          </NuxtLink>

          <!-- Entry Types -->
          <h3 class="text-sm font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
            Journal Entry Types
          </h3>
          <p class="text-sm text-stone-500 dark:text-stone-400 mb-3">
            Show or hide entry types from the journal add page
          </p>
          <div
            class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700"
          >
            <!-- Built-in entry types -->
            <div
              v-for="entryType in builtInEntryTypes"
              :key="entryType.value"
              class="p-4 flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ entryType.emoji }}</span>
                <div>
                  <span class="font-medium text-stone-800 dark:text-stone-100">
                    {{ entryType.label }}
                  </span>
                  <p class="text-xs text-stone-500 dark:text-stone-400">
                    {{ entryType.description }}
                  </p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  :checked="isEntryTypeVisible(entryType.value)"
                  class="sr-only peer"
                  @change="toggleEntryTypeVisibility(entryType.value)"
                />
                <div
                  class="w-11 h-6 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:bg-tada-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                />
              </label>
            </div>

            <!-- Custom entry types -->
            <div
              v-for="customType in customEntryTypes"
              :key="customType.name"
              class="p-4 flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ customType.emoji }}</span>
                <div>
                  <span class="font-medium text-stone-800 dark:text-stone-100">
                    {{ customType.name }}
                  </span>
                  <span
                    class="ml-2 text-xs px-1.5 py-0.5 bg-tada-100 dark:bg-tada-900/30 text-tada-700 dark:text-tada-300 rounded"
                  >
                    Custom
                  </span>
                </div>
              </div>
              <button
                class="p-2 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
                title="Remove custom type"
                @click="removeCustomType(customType.name)"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>

            <!-- Add custom entry type -->
            <div class="p-4">
              <button
                v-if="!isAddingCustomType"
                class="w-full flex items-center justify-center gap-2 py-2 text-tada-600 dark:text-tada-400 hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded-lg transition-colors"
                @click="isAddingCustomType = true"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add custom entry type
              </button>

              <div v-else class="space-y-3">
                <div class="flex gap-2">
                  <button
                    class="text-2xl p-2 border border-stone-300 dark:border-stone-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
                    @click="openCustomTypeEmojiPicker"
                  >
                    {{ newCustomType.emoji || "😀" }}
                  </button>
                  <input
                    v-model="newCustomType.name"
                    type="text"
                    placeholder="Entry type name"
                    class="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-tada-500"
                  />
                </div>
                <div class="flex gap-2">
                  <button
                    class="flex-1 py-2 px-3 bg-tada-600 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
                    :disabled="!newCustomType.name.trim()"
                    @click="addCustomType"
                  >
                    Add
                  </button>
                  <button
                    class="flex-1 py-2 px-3 bg-stone-200 dark:bg-stone-600 text-stone-700 dark:text-stone-200 text-sm font-medium rounded-lg hover:opacity-90"
                    @click="cancelAddCustomType"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Ta-Da! Sounds -->
          <h3 class="text-sm font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3 mt-6">
            Ta-Da! Sounds
          </h3>
          <div
            class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
          >
            <div class="p-4">
              <label
                class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-3"
              >
                Celebration sound
              </label>
              <div class="space-y-2">
                <label
                  v-for="option in tadaSoundOptions"
                  :key="option.value"
                  class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                  :class="
                    settings.tadaSound === option.value
                      ? 'border-tada-500 bg-tada-50 dark:bg-tada-900/20'
                      : 'border-stone-200 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700'
                  "
                >
                  <input
                    v-model="settings.tadaSound"
                    type="radio"
                    name="tadaSound"
                    :value="option.value"
                    class="w-4 h-4 text-tada-600"
                    @change="saveSettings"
                  />
                  <div class="flex-1">
                    <span
                      class="text-sm font-medium text-stone-800 dark:text-stone-100"
                    >
                      {{ option.label }}
                    </span>
                    <p class="text-xs text-stone-500 dark:text-stone-400">
                      {{ option.description }}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="p-2 rounded-lg bg-stone-100 dark:bg-stone-600 hover:bg-stone-200 dark:hover:bg-stone-500 transition-colors"
                    title="Preview sound"
                    @click.prevent="previewTadaSound(option.file)"
                  >
                    🔊
                  </button>
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- Appearance (Theme + Notifications) -->
        <section id="section-appearance">
          <h2
            class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4"
          >
            Appearance
          </h2>
          <div
            class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700"
          >
            <!-- Theme -->
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
                      ? 'border-tada-300 bg-tada-100/20 dark:border-tada-600 dark:bg-tada-600/10'
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

            <!-- Push Notifications -->
            <div class="p-4">
              <div class="flex items-center justify-between">
                <div>
                  <label
                    class="text-sm font-medium text-stone-700 dark:text-stone-300"
                  >
                    Push notifications
                  </label>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Reminders for rhythms and session completion
                  </p>
                </div>
                <button
                  type="button"
                  class="relative w-12 h-7 rounded-full transition-colors"
                  :class="
                    settings.notifications
                      ? 'bg-tada-600 dark:bg-tada-600'
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
        <section id="section-data">
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

            <!-- Import -->
            <NuxtLink
              to="/import"
              class="w-full p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors rounded-lg"
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
                    Import from CSV files (Insight Timer, etc.)
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
            </NuxtLink>

            <!-- Delete Category Data -->
            <button
              class="w-full p-4 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
              @click="openDeleteCategoryModal"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl">🗑️</span>
                <div>
                  <span
                    class="block text-sm font-medium text-red-600 dark:text-red-400"
                  >
                    Delete category data
                  </span>
                  <span class="text-xs text-stone-500 dark:text-stone-400">
                    Remove all entries from a specific category
                  </span>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-red-400"
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

        <!-- Version footer (About page accessible via help panel) -->
        <div class="text-center text-xs text-stone-500 dark:text-stone-500 py-4">
          Ta-Da! v{{ appVersion }}<template v-if="gitHash">+{{ gitHash }}</template>
          ·
          <NuxtLink to="/about" class="hover:underline">About</NuxtLink>
          ·
          <a href="https://github.com/InfantLab/tada" target="_blank" class="hover:underline">GitHub</a>
        </div>

        <!-- Autosave status indicator -->
        <div class="flex items-center justify-center gap-2 py-4 text-sm">
          <template v-if="isSaving">
            <div
              class="animate-spin h-4 w-4 border-2 border-tada-600 border-t-transparent rounded-full"
            />
            <span class="text-stone-500 dark:text-stone-400">Saving...</span>
          </template>
          <template v-else-if="lastSaved">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span class="text-stone-500 dark:text-stone-400"
              >Settings autosaved</span
            >
          </template>
          <template v-else>
            <span class="text-stone-400 dark:text-stone-500"
              >Settings will autosave when changed</span
            >
          </template>
        </div>
      </div>
    </div>

    <!-- Emoji Picker Modal -->
    <EmojiPicker
      v-model="showEmojiPicker"
      :entry-name="emojiPickerTarget?.name"
      @select="handleEmojiSelected"
    />

    <!-- Delete Category Data Modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteCategoryModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50"
          @click="cancelDeleteCategory"
        />

        <!-- Modal -->
        <div
          class="relative bg-white dark:bg-stone-800 rounded-2xl shadow-xl max-w-md w-full p-6"
        >
          <h3 class="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">
            Delete Category Data
          </h3>

          <!-- Category selection -->
          <div v-if="!selectedDeleteCategory" class="space-y-2">
            <p class="text-sm text-stone-600 dark:text-stone-400 mb-4">
              Select a category to delete all its entries:
            </p>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <button
                v-for="cat in allCategories"
                :key="cat"
                class="w-full p-3 flex items-center gap-3 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors text-left"
                @click="selectDeleteCategory(cat)"
              >
                <span class="text-xl">{{
                  getCustomEmoji(cat) || getCategoryEmoji(cat)
                }}</span>
                <span
                  class="font-medium text-stone-800 dark:text-stone-100 capitalize"
                >
                  {{ cat }}
                </span>
              </button>
            </div>
            <button
              class="mt-4 w-full py-2 px-4 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium rounded-lg hover:opacity-90 transition-colors"
              @click="cancelDeleteCategory"
            >
              Cancel
            </button>
          </div>

          <!-- Confirmation -->
          <div v-else>
            <div class="mb-6 text-center">
              <span class="text-4xl block mb-2">
                {{
                  getCustomEmoji(selectedDeleteCategory) ||
                  getCategoryEmoji(selectedDeleteCategory)
                }}
              </span>
              <p class="text-stone-600 dark:text-stone-400">
                You are about to delete
              </p>
              <p class="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {{ deleteCategoryCount }} entries
              </p>
              <p class="text-stone-600 dark:text-stone-400 mt-1">
                from
                <span class="font-semibold capitalize">{{
                  selectedDeleteCategory
                }}</span>
              </p>
            </div>

            <p
              class="text-sm text-stone-500 dark:text-stone-400 mb-4 text-center"
            >
              This action can be undone within 15 seconds.
            </p>

            <div class="flex gap-3">
              <button
                class="flex-1 py-2 px-4 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium rounded-lg hover:opacity-90 transition-colors"
                @click="cancelDeleteCategory"
              >
                Cancel
              </button>
              <button
                :disabled="isDeletingCategory || deleteCategoryCount === 0"
                class="flex-1 py-2 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                @click="confirmDeleteCategory"
              >
                {{ isDeletingCategory ? "Deleting..." : "Delete" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<style scoped>
/* Hide scrollbar for mobile tabs */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Smooth scroll for sections */
html {
  scroll-behavior: smooth;
}

/* Section scroll margin for sticky header */
section[id^="section-"] {
  scroll-margin-top: 6rem;
}
</style>
