/**
 * Shared form logic for entry creation and editing.
 *
 * Provides reactive category/subcategory options filtered
 * by user visibility preferences.
 */
import type { Ref } from "vue";
import {
  CATEGORY_DEFAULTS,
  getSubcategoriesForCategory,
} from "~/utils/categoryDefaults";

export function useEntryForm(category: Ref<string | null | undefined>) {
  const { isCategoryVisible } = usePreferences();

  const categoryOptions = computed(() => {
    return Object.keys(CATEGORY_DEFAULTS)
      .filter((slug) => isCategoryVisible(slug))
      .map((slug) => ({
        value: slug,
        label: CATEGORY_DEFAULTS[slug]!.label,
        emoji: CATEGORY_DEFAULTS[slug]!.emoji,
      }));
  });

  const subcategoryOptions = computed(() => {
    if (!category.value) return [];
    return getSubcategoriesForCategory(category.value).map((s) => ({
      value: s.slug,
      label: s.label,
      emoji: s.emoji,
    }));
  });

  return {
    categoryOptions,
    subcategoryOptions,
  };
}
