<script setup lang="ts">
/**
 * Category Management Page
 *
 * Dedicated page for all category customization:
 * - Emoji customization for categories and subcategories
 * - Category visibility (show/hide)
 * - Custom categories (add/remove)
 */

import {
  CATEGORY_DEFAULTS,
  getSubcategoriesForCategory,
  getCategoryEmoji,
  getSubcategoryEmoji,
} from "~/utils/categoryDefaults";

definePageMeta({
  layout: "default",
});

const { success: showSuccess, error: showError } = useToast();

const {
  preferences,
  isLoaded,
  loadPreferences,
  isCategoryVisible,
  getCustomEmoji,
  setCustomEmoji,
  hideCategory,
  showCategory,
  savePreferences,
} = usePreferences();

// Load preferences on mount
onMounted(async () => {
  await loadPreferences();
});

// Get all default categories
const defaultCategories = computed(() => {
  return Object.entries(CATEGORY_DEFAULTS).map(([slug, def]) => ({
    slug,
    label: def.label,
    emoji: getCustomEmoji(slug) || def.emoji,
    color: def.color,
    subcategories: def.subcategories,
    visible: isCategoryVisible(slug),
  }));
});

// Custom categories from preferences
const customCategories = computed(() => {
  return preferences.value.customCategories || [];
});

// Separate visible and hidden categories
const visibleCategories = computed(() =>
  defaultCategories.value.filter((c) => c.visible)
);
const hiddenCategories = computed(() =>
  defaultCategories.value.filter((c) => !c.visible)
);

// Expanded category state
const expandedCategory = ref<string | null>(null);

function toggleExpanded(slug: string) {
  expandedCategory.value = expandedCategory.value === slug ? null : slug;
}

// Emoji picker state
const showEmojiPicker = ref(false);
const emojiPickerTarget = ref<{
  type: "category" | "subcategory" | "custom";
  key: string;
  label: string;
} | null>(null);

function openEmojiPicker(
  type: "category" | "subcategory" | "custom",
  key: string,
  label: string
) {
  emojiPickerTarget.value = { type, key, label };
  showEmojiPicker.value = true;
}

async function handleEmojiSelect(emoji: string) {
  if (!emojiPickerTarget.value) return;

  const { type, key } = emojiPickerTarget.value;

  if (type === "category" || type === "subcategory") {
    // Special handling for new subcategory
    if (key === "_new_sub") {
      subcategoryFormData.value.emoji = emoji;
    } else {
      await setCustomEmoji(key, emoji);
      showSuccess("Emoji updated");
    }
  } else if (type === "custom") {
    // Handle new category emoji selection
    if (key === "_new") {
      newCategory.value.emoji = emoji;
    } else {
      // Handle custom category emoji update
      const customCats = [...(preferences.value.customCategories || [])];
      const idx = customCats.findIndex((c) => c.slug === key);
      if (idx !== -1) {
        customCats[idx] = { ...customCats[idx], emoji };
        await savePreferences({ customCategories: customCats });
        showSuccess("Emoji updated");
      }
    }
  }

  showEmojiPicker.value = false;
  emojiPickerTarget.value = null;
}

// Toggle category visibility
async function toggleVisibility(slug: string, currentlyVisible: boolean) {
  if (currentlyVisible) {
    await hideCategory(slug);
    showSuccess(`${slug} hidden from pickers`);
  } else {
    await showCategory(slug);
    showSuccess(`${slug} is now visible`);
  }
}

// Add custom category modal
const showAddCategoryModal = ref(false);
const newCategory = ref({
  name: "",
  emoji: "📌",
});

function openAddCategoryModal() {
  newCategory.value = { name: "", emoji: "📌" };
  showAddCategoryModal.value = true;
}

async function addCustomCategory() {
  const name = newCategory.value.name.trim();
  if (!name) {
    showError("Please enter a category name");
    return;
  }

  // Generate slug from name
  const slug = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  // Check for duplicates
  const existingSlugs = [
    ...Object.keys(CATEGORY_DEFAULTS),
    ...(preferences.value.customCategories || []).map((c) => c.slug),
  ];
  if (existingSlugs.includes(slug)) {
    showError("A category with this name already exists");
    return;
  }

  const customCats = [
    ...(preferences.value.customCategories || []),
    {
      slug,
      label: name,
      emoji: newCategory.value.emoji,
      subcategories: [],
      createdAt: new Date().toISOString(),
    },
  ];

  await savePreferences({ customCategories: customCats });
  showSuccess(`Created category "${name}"`);
  showAddCategoryModal.value = false;
}

async function removeCustomCategory(slug: string) {
  if (!confirm("Remove this category? Existing entries will keep their data.")) {
    return;
  }

  const customCats = (preferences.value.customCategories || []).filter(
    (c) => c.slug !== slug
  );
  await savePreferences({ customCategories: customCats });
  showSuccess("Category removed");
}

// Subcategory management
const showAddSubcategoryModal = ref(false);
const subcategoryFormData = ref({ name: "", emoji: "🏷️" });
const activeCategory = ref<string | null>(null);

function openAddSubcategoryModal(catSlug: string) {
  activeCategory.value = catSlug;
  subcategoryFormData.value = { name: "", emoji: "🏷️" };
  showAddSubcategoryModal.value = true;
}

async function addSubcategory() {
  if (!activeCategory.value || !subcategoryFormData.value.name.trim()) {
    showError("Please enter a subcategory name");
    return;
  }

  const catSlug = activeCategory.value;
  const subName = subcategoryFormData.value.name.trim();
  const subSlug = subName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  // Check if this is a built-in or custom category
  const isBuiltIn = Object.keys(CATEGORY_DEFAULTS).includes(catSlug);

  if (isBuiltIn) {
    // For built-in categories, we store custom subcategories in preferences
    const customSubs = preferences.value.customSubcategories || {};
    const catCustomSubs = customSubs[catSlug] || [];

    // Check for duplicates
    const existingSlugs = [
      ...getSubcategoriesForCategory(catSlug).map(s => s.slug),
      ...catCustomSubs.map(s => s.slug),
    ];

    if (existingSlugs.includes(subSlug)) {
      showError("A subcategory with this name already exists");
      return;
    }

    catCustomSubs.push({
      slug: subSlug,
      label: subName,
      emoji: subcategoryFormData.value.emoji,
    });

    customSubs[catSlug] = catCustomSubs;
    await savePreferences({ customSubcategories: customSubs });
  } else {
    // For custom categories, update the category's subcategories array
    const customCats = [...(preferences.value.customCategories || [])];
    const catIndex = customCats.findIndex(c => c.slug === catSlug);

    if (catIndex === -1) return;

    const cat = customCats[catIndex];
    const existingSlugs = (cat.subcategories || []).map(s => s.slug);

    if (existingSlugs.includes(subSlug)) {
      showError("A subcategory with this name already exists");
      return;
    }

    cat.subcategories = [
      ...(cat.subcategories || []),
      {
        slug: subSlug,
        label: subName,
        emoji: subcategoryFormData.value.emoji,
      },
    ];

    customCats[catIndex] = cat;
    await savePreferences({ customCategories: customCats });
  }

  showSuccess(`Added subcategory "${subName}"`);
  showAddSubcategoryModal.value = false;
}

async function removeSubcategory(catSlug: string, subSlug: string) {
  if (!confirm("Remove this subcategory? Existing entries will keep their data.")) {
    return;
  }

  const isBuiltIn = Object.keys(CATEGORY_DEFAULTS).includes(catSlug);

  if (isBuiltIn) {
    // Remove from custom subcategories
    const customSubs = { ...(preferences.value.customSubcategories || {}) };
    if (customSubs[catSlug]) {
      customSubs[catSlug] = customSubs[catSlug].filter(s => s.slug !== subSlug);
      await savePreferences({ customSubcategories: customSubs });
    }
  } else {
    // Remove from custom category
    const customCats = [...(preferences.value.customCategories || [])];
    const catIndex = customCats.findIndex(c => c.slug === catSlug);
    if (catIndex !== -1) {
      const cat = customCats[catIndex];
      cat.subcategories = (cat.subcategories || []).filter(s => s.slug !== subSlug);
      customCats[catIndex] = cat;
      await savePreferences({ customCategories: customCats });
    }
  }

  showSuccess("Subcategory removed");
}

async function resetCategoryToDefault(catSlug: string) {
  if (!confirm("Reset this category to default? All custom emojis and subcategories will be removed.")) {
    return;
  }

  // Remove custom emojis for this category
  const customEmojis = { ...(preferences.value.customEmojis || {}) };
  const keysToRemove = Object.keys(customEmojis).filter(key =>
    key === catSlug || key.startsWith(`${catSlug}:`)
  );

  for (const key of keysToRemove) {
    Reflect.deleteProperty(customEmojis, key);
  }

  // Remove custom subcategories
  const customSubs = { ...(preferences.value.customSubcategories || {}) };
  Reflect.deleteProperty(customSubs, catSlug);

  await savePreferences({
    customEmojis,
    customSubcategories: customSubs,
  });

  showSuccess(`Reset "${catSlug}" to default`);
}

// Get all subcategories for a category (built-in + custom)
function getAllSubcategories(catSlug: string) {
  const isBuiltIn = Object.keys(CATEGORY_DEFAULTS).includes(catSlug);

  if (isBuiltIn) {
    const builtInSubs = getSubcategoriesForCategory(catSlug);
    const customSubs = (preferences.value.customSubcategories?.[catSlug] || []);
    return [...builtInSubs, ...customSubs];
  } else {
    // Custom category
    const customCat = (preferences.value.customCategories || []).find(c => c.slug === catSlug);
    return customCat?.subcategories || [];
  }
}

// Check if subcategory is custom (not built-in)
function isCustomSubcategory(catSlug: string, subSlug: string): boolean {
  const isBuiltIn = Object.keys(CATEGORY_DEFAULTS).includes(catSlug);

  if (isBuiltIn) {
    const builtInSubs = getSubcategoriesForCategory(catSlug).map(s => s.slug);
    return !builtInSubs.includes(subSlug);
  }

  return true; // All subcategories of custom categories are custom
}

// Get resolved emoji for display
function getDisplayEmoji(slug: string): string {
  return getCustomEmoji(slug) || getCategoryEmoji(slug);
}

function getSubcatDisplayEmoji(catSlug: string, subcatSlug: string): string {
  const customKey = `${catSlug}:${subcatSlug}`;
  return getCustomEmoji(customKey) || getSubcategoryEmoji(catSlug, subcatSlug);
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-8">
      <NuxtLink
        to="/settings"
        class="p-2 -ml-2 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
          Categories
        </h1>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Customize emojis and visibility
        </p>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="!isLoaded" class="text-center py-12">
      <div class="animate-pulse text-4xl mb-4">📁</div>
      <p class="text-stone-600 dark:text-stone-400">Loading categories...</p>
    </div>

    <div v-else class="space-y-8">
      <!-- Visible Categories -->
      <section>
        <h2 class="text-sm font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-4">
          Visible Categories
        </h2>
        <div class="space-y-2">
          <div
            v-for="cat in visibleCategories"
            :key="cat.slug"
            class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden"
          >
            <!-- Category header -->
            <div class="p-4 flex items-center gap-4">
              <!-- Emoji (clickable) -->
              <button
                type="button"
                class="text-2xl hover:scale-110 transition-transform"
                title="Click to change emoji"
                @click="openEmojiPicker('category', cat.slug, cat.label)"
              >
                {{ getDisplayEmoji(cat.slug) }}
              </button>

              <!-- Name and subcategory count -->
              <button
                type="button"
                class="flex-1 text-left"
                @click="toggleExpanded(cat.slug)"
              >
                <span class="font-medium text-stone-800 dark:text-stone-100">
                  {{ cat.label }}
                </span>
                <span class="text-sm text-stone-500 dark:text-stone-400 ml-2">
                  {{ cat.subcategories.length }} subcategories
                </span>
              </button>

              <!-- Expand/collapse indicator -->
              <button
                type="button"
                class="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                @click="toggleExpanded(cat.slug)"
              >
                <svg
                  class="w-5 h-5 transition-transform"
                  :class="{ 'rotate-180': expandedCategory === cat.slug }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Hide button -->
              <button
                type="button"
                class="px-3 py-1.5 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
                @click="toggleVisibility(cat.slug, true)"
              >
                Hide
              </button>
            </div>

            <!-- Subcategories (expanded) -->
            <div
              v-if="expandedCategory === cat.slug"
              class="px-4 pb-4 pt-0"
            >
              <div class="border-t border-stone-200 dark:border-stone-700 pt-4">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-xs text-stone-500 dark:text-stone-400">
                    Click emoji to customize, × to remove custom subcategories
                  </p>
                  <button
                    type="button"
                    class="text-xs text-tada-600 dark:text-tada-400 hover:underline"
                    @click="resetCategoryToDefault(cat.slug)"
                  >
                    Reset to default
                  </button>
                </div>
                <div class="flex flex-wrap gap-2 mb-3">
                  <div
                    v-for="sub in getAllSubcategories(cat.slug)"
                    :key="sub.slug"
                    class="group relative"
                  >
                    <button
                      type="button"
                      class="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-700 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                      @click="openEmojiPicker('subcategory', `${cat.slug}:${sub.slug}`, sub.label)"
                    >
                      <span class="text-lg">{{ getSubcatDisplayEmoji(cat.slug, sub.slug) }}</span>
                      <span class="text-sm text-stone-700 dark:text-stone-300">{{ sub.label }}</span>
                    </button>
                    <!-- Remove button for custom subcategories -->
                    <button
                      v-if="isCustomSubcategory(cat.slug, sub.slug)"
                      type="button"
                      class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Remove subcategory"
                      @click.stop="removeSubcategory(cat.slug, sub.slug)"
                    >
                      ×
                    </button>
                  </div>

                  <!-- Add subcategory button -->
                  <button
                    type="button"
                    class="px-3 py-1.5 border-2 border-dashed border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 rounded-lg hover:border-tada-500 hover:text-tada-600 dark:hover:text-tada-400 transition-colors text-sm"
                    @click="openAddSubcategoryModal(cat.slug)"
                  >
                    + Add subcategory
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Hidden Categories -->
      <section v-if="hiddenCategories.length > 0">
        <h2 class="text-sm font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-4">
          Hidden Categories
        </h2>
        <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700">
          <div
            v-for="cat in hiddenCategories"
            :key="cat.slug"
            class="p-4 flex items-center gap-4"
          >
            <span class="text-2xl opacity-50">{{ getDisplayEmoji(cat.slug) }}</span>
            <span class="flex-1 font-medium text-stone-600 dark:text-stone-400">
              {{ cat.label }}
            </span>
            <button
              type="button"
              class="px-3 py-1.5 text-sm text-tada-600 dark:text-tada-400 hover:bg-tada-50 dark:hover:bg-tada-900/20 rounded-lg transition-colors"
              @click="toggleVisibility(cat.slug, false)"
            >
              Show
            </button>
          </div>
        </div>
        <p class="text-xs text-stone-500 dark:text-stone-400 mt-2">
          Hidden categories still appear for existing entries
        </p>
      </section>

      <!-- Custom Categories -->
      <section>
        <h2 class="text-sm font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-4">
          Custom Categories
        </h2>

        <div v-if="customCategories.length > 0" class="space-y-2 mb-4">
          <div
            v-for="cat in customCategories"
            :key="cat.slug"
            class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 flex items-center gap-4"
          >
            <button
              type="button"
              class="text-2xl hover:scale-110 transition-transform"
              @click="openEmojiPicker('custom', cat.slug, cat.label)"
            >
              {{ cat.emoji }}
            </button>
            <div class="flex-1">
              <span class="font-medium text-stone-800 dark:text-stone-100">
                {{ cat.label }}
              </span>
              <span class="ml-2 text-xs px-1.5 py-0.5 bg-tada-100 dark:bg-tada-900/30 text-tada-700 dark:text-tada-300 rounded">
                Custom
              </span>
            </div>
            <button
              type="button"
              class="p-2 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
              title="Remove category"
              @click="removeCustomCategory(cat.slug)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <button
          type="button"
          class="w-full p-4 border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl text-stone-600 dark:text-stone-400 hover:border-tada-500 hover:text-tada-600 dark:hover:text-tada-400 transition-colors flex items-center justify-center gap-2"
          @click="openAddCategoryModal"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Custom Category
        </button>
      </section>
    </div>

    <!-- Emoji Picker Modal -->
    <EmojiPicker
      v-model="showEmojiPicker"
      @select="handleEmojiSelect"
    />

    <!-- Add Category Modal -->
    <Teleport to="body">
      <div
        v-if="showAddCategoryModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/50"
          @click="showAddCategoryModal = false"
        />
        <div
          class="relative bg-white dark:bg-stone-800 rounded-xl shadow-xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto"
        >
          <h3 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">
            Add Custom Category
          </h3>

          <div class="space-y-4">
            <div class="flex items-center gap-4">
              <button
                type="button"
                class="text-4xl p-2 bg-stone-100 dark:bg-stone-700 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                @click="openEmojiPicker('custom', '_new', 'New Category')"
              >
                {{ newCategory.emoji }}
              </button>
              <input
                v-model="newCategory.name"
                type="text"
                placeholder="Category name"
                class="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-tada-500"
                @keyup.enter="addCustomCategory"
              />
            </div>

            <div class="flex gap-3">
              <button
                type="button"
                class="flex-1 px-4 py-2 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                @click="showAddCategoryModal = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="flex-1 px-4 py-2 bg-tada-600 text-white rounded-lg hover:bg-tada-700 transition-colors"
                @click="addCustomCategory"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Subcategory Modal -->
      <div
        v-if="showAddSubcategoryModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/50"
          @click="showAddSubcategoryModal = false"
        />
        <div
          class="relative bg-white dark:bg-stone-800 rounded-xl shadow-xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto"
        >
          <h3 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">
            Add Subcategory
          </h3>

          <div class="space-y-4">
            <div class="flex items-center gap-4">
              <button
                type="button"
                class="text-4xl p-2 bg-stone-100 dark:bg-stone-700 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                @click="openEmojiPicker('subcategory', '_new_sub', 'New Subcategory')"
              >
                {{ subcategoryFormData.emoji }}
              </button>
              <input
                v-model="subcategoryFormData.name"
                type="text"
                placeholder="Subcategory name"
                class="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-tada-500"
                @keyup.enter="addSubcategory"
              />
            </div>

            <div class="flex gap-3">
              <button
                type="button"
                class="flex-1 px-4 py-2 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                @click="showAddSubcategoryModal = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="flex-1 px-4 py-2 bg-tada-600 text-white rounded-lg hover:bg-tada-700 transition-colors"
                @click="addSubcategory"
              >
                Add Subcategory
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
