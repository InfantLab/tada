/**
 * User Preferences Composable
 * Manages user customisation settings including hidden categories, custom emojis, etc.
 */

import type { UserPreferences } from "~/server/db/schema";

export interface PreferencesState {
  hiddenCategories: string[];
  hiddenEntryTypes: string[];
  customEmojis: Record<string, string>;
  customEntryTypes: Array<{ name: string; emoji: string }>;
}

const preferences = ref<PreferencesState>({
  hiddenCategories: [],
  hiddenEntryTypes: [],
  customEmojis: {},
  customEntryTypes: [],
});

const isLoaded = ref(false);
const isLoading = ref(false);

export const usePreferences = () => {
  /**
   * Load preferences from API
   */
  const loadPreferences = async () => {
    if (isLoading.value) return;

    isLoading.value = true;
    try {
      const data = await $fetch<UserPreferences | null>("/api/preferences");
      if (data) {
        preferences.value = {
          hiddenCategories: data.hiddenCategories || [],
          hiddenEntryTypes: data.hiddenEntryTypes || [],
          customEmojis: data.customEmojis || {},
          customEntryTypes: data.customEntryTypes || [],
        };
      }
      isLoaded.value = true;
    } catch {
      // If no preferences exist yet, use defaults
      isLoaded.value = true;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Save preferences to API
   */
  const savePreferences = async (updates: Partial<PreferencesState>) => {
    try {
      const data = await $fetch<UserPreferences>("/api/preferences", {
        method: "PUT",
        body: updates,
      });

      // Update local state with response
      preferences.value = {
        hiddenCategories: data.hiddenCategories || [],
        hiddenEntryTypes: data.hiddenEntryTypes || [],
        customEmojis: data.customEmojis || {},
        customEntryTypes: data.customEntryTypes || [],
      };

      return true;
    } catch {
      return false;
    }
  };

  /**
   * Check if a category is visible (not hidden)
   */
  const isCategoryVisible = (category: string) => {
    return !preferences.value.hiddenCategories.includes(category);
  };

  /**
   * Check if an entry type is visible (not hidden)
   */
  const isEntryTypeVisible = (entryType: string) => {
    return !preferences.value.hiddenEntryTypes.includes(entryType);
  };

  /**
   * Get custom emoji for a category/subcategory, or return null
   */
  const getCustomEmoji = (key: string): string | null => {
    return preferences.value.customEmojis[key] || null;
  };

  /**
   * Set custom emoji for a category/subcategory
   */
  const setCustomEmoji = async (key: string, emoji: string) => {
    const customEmojis = { ...preferences.value.customEmojis, [key]: emoji };
    return savePreferences({ customEmojis });
  };

  /**
   * Hide a category
   */
  const hideCategory = async (category: string) => {
    if (preferences.value.hiddenCategories.includes(category)) return true;
    const hiddenCategories = [...preferences.value.hiddenCategories, category];
    return savePreferences({ hiddenCategories });
  };

  /**
   * Show (unhide) a category
   */
  const showCategory = async (category: string) => {
    const hiddenCategories = preferences.value.hiddenCategories.filter(
      (c) => c !== category
    );
    return savePreferences({ hiddenCategories });
  };

  /**
   * Hide an entry type from journal add page
   */
  const hideEntryType = async (entryType: string) => {
    if (preferences.value.hiddenEntryTypes.includes(entryType)) return true;
    const hiddenEntryTypes = [...preferences.value.hiddenEntryTypes, entryType];
    return savePreferences({ hiddenEntryTypes });
  };

  /**
   * Show (unhide) an entry type
   */
  const showEntryType = async (entryType: string) => {
    const hiddenEntryTypes = preferences.value.hiddenEntryTypes.filter(
      (t) => t !== entryType
    );
    return savePreferences({ hiddenEntryTypes });
  };

  /**
   * Add a custom entry type
   */
  const addCustomEntryType = async (name: string, emoji: string) => {
    const customEntryTypes = [
      ...preferences.value.customEntryTypes,
      { name, emoji },
    ];
    return savePreferences({ customEntryTypes });
  };

  /**
   * Remove a custom entry type
   */
  const removeCustomEntryType = async (name: string) => {
    const customEntryTypes = preferences.value.customEntryTypes.filter(
      (t) => t.name !== name
    );
    return savePreferences({ customEntryTypes });
  };

  /**
   * Get all visible categories (filter out hidden ones)
   */
  const getVisibleCategories = (allCategories: string[]) => {
    return allCategories.filter(isCategoryVisible);
  };

  /**
   * Get all visible entry types (built-in + custom, minus hidden)
   */
  const getVisibleEntryTypes = (
    builtInTypes: Array<{ name: string; emoji: string }>
  ) => {
    const filtered = builtInTypes.filter((t) => isEntryTypeVisible(t.name));
    return [...filtered, ...preferences.value.customEntryTypes];
  };

  // Subcategory suggestions cache
  const subcategorySuggestions = ref<Record<string, string[]>>({});
  const isLoadingSubcategories = ref(false);

  /**
   * Load subcategory suggestions from API
   */
  const loadSubcategorySuggestions = async () => {
    if (isLoadingSubcategories.value) return;

    isLoadingSubcategories.value = true;
    try {
      const data = await $fetch<Record<string, string[]>>("/api/subcategories");
      subcategorySuggestions.value = data;
    } catch {
      // Fail silently - suggestions are optional
    } finally {
      isLoadingSubcategories.value = false;
    }
  };

  /**
   * Get subcategory suggestions for a category
   */
  const getSubcategorySuggestions = (category: string): string[] => {
    return subcategorySuggestions.value[category] || [];
  };

  /**
   * Add a new subcategory suggestion (client-side only, for immediate UI update)
   */
  const addSubcategorySuggestion = (category: string, subcategory: string) => {
    if (!subcategorySuggestions.value[category]) {
      subcategorySuggestions.value[category] = [];
    }
    if (!subcategorySuggestions.value[category].includes(subcategory)) {
      subcategorySuggestions.value[category].push(subcategory);
    }
  };

  return {
    preferences: readonly(preferences),
    isLoaded: readonly(isLoaded),
    isLoading: readonly(isLoading),
    loadPreferences,
    savePreferences,
    isCategoryVisible,
    isEntryTypeVisible,
    getCustomEmoji,
    setCustomEmoji,
    hideCategory,
    showCategory,
    hideEntryType,
    showEntryType,
    addCustomEntryType,
    removeCustomEntryType,
    getVisibleCategories,
    getVisibleEntryTypes,
    // Subcategory suggestions
    subcategorySuggestions: readonly(subcategorySuggestions),
    loadSubcategorySuggestions,
    getSubcategorySuggestions,
    addSubcategorySuggestion,
  };
};
