import { describe, it, expect } from "vitest";
import {
  CATEGORY_DEFAULTS,
  SUBCATEGORY_DEFAULTS,
  DEFAULT_EMOJI,
  DEFAULT_COLOR,
  getEntryDisplayProps,
  getSubcategoriesForCategory,
  getSubcategoryEmoji,
} from "./categoryDefaults";

describe("categoryDefaults", () => {
  describe("CATEGORY_DEFAULTS", () => {
    it("should have all required categories", () => {
      const expectedCategories = [
        "mindfulness",
        "movement",
        "creative",
        "learning",
        "journal",
        "accomplishment",
        "events",
      ];

      expectedCategories.forEach((category) => {
        expect(CATEGORY_DEFAULTS[category]).toBeDefined();
      });
    });

    it("should have valid emoji, color, and label for each category", () => {
      Object.entries(CATEGORY_DEFAULTS).forEach(([_slug, category]) => {
        expect(category.emoji).toBeTruthy();
        expect(category.color).toMatch(/^#[0-9A-F]{6}$/i);
        expect(category.label).toBeTruthy();
        expect(Array.isArray(category.subcategories)).toBe(true);
      });
    });

    it("should have valid subcategories", () => {
      Object.values(CATEGORY_DEFAULTS).forEach((category) => {
        expect(category.subcategories.length).toBeGreaterThan(0);
        category.subcategories.forEach((subcat) => {
          expect(subcat.slug).toBeTruthy();
          expect(subcat.emoji).toBeTruthy();
          expect(subcat.label).toBeTruthy();
        });
      });
    });

    it("should mark timed categories correctly", () => {
      expect(CATEGORY_DEFAULTS["mindfulness"]?.allowedForTimed).toBe(true);
      expect(CATEGORY_DEFAULTS["movement"]?.allowedForTimed).toBe(true);
      expect(CATEGORY_DEFAULTS["journal"]?.allowedForTimed).toBeUndefined();
    });
  });

  describe("SUBCATEGORY_DEFAULTS", () => {
    it("should be populated with subcategories", () => {
      expect(Object.keys(SUBCATEGORY_DEFAULTS).length).toBeGreaterThan(0);
    });

    it("should have valid properties for each subcategory", () => {
      Object.entries(SUBCATEGORY_DEFAULTS).forEach(([slug, subcat]) => {
        expect(slug).toBeTruthy();
        expect(subcat.emoji).toBeTruthy();
        expect(subcat.label).toBeTruthy();
        expect(subcat.category).toBeTruthy();
        expect(CATEGORY_DEFAULTS[subcat.category]).toBeDefined();
      });
    });

    it("should handle duplicate subcategory slugs across categories", () => {
      // 'walking' exists in both mindfulness and movement
      expect(SUBCATEGORY_DEFAULTS["walking"]).toBeDefined();
      expect(SUBCATEGORY_DEFAULTS["walking"]?.label).toBeTruthy();
    });
  });

  describe("getEntryDisplayProps", () => {
    it("should use custom emoji when provided", () => {
      const result = getEntryDisplayProps({
        emoji: "🎯",
        category: "mindfulness",
        subcategory: "sitting",
      });

      expect(result.emoji).toBe("🎯");
    });

    it("should use subcategory emoji when no custom emoji", () => {
      const result = getEntryDisplayProps({
        emoji: null,
        category: "mindfulness",
        subcategory: "sitting",
      });

      expect(result.emoji).toBe("🧘");
    });

    it("should use category emoji when no subcategory", () => {
      const result = getEntryDisplayProps({
        emoji: null,
        category: "mindfulness",
        subcategory: null,
      });

      expect(result.emoji).toBe("🧘");
    });

    it("should use default emoji when nothing provided", () => {
      const result = getEntryDisplayProps({
        emoji: null,
        category: null,
        subcategory: null,
      });

      expect(result.emoji).toBe(DEFAULT_EMOJI);
    });

    it("should return category color", () => {
      const result = getEntryDisplayProps({
        category: "mindfulness",
      });

      expect(result.color).toBe("#7C3AED");
    });

    it("should return default color when no category", () => {
      const result = getEntryDisplayProps({
        category: null,
      });

      expect(result.color).toBe(DEFAULT_COLOR);
    });

    it("should return subcategory label", () => {
      const result = getEntryDisplayProps({
        subcategory: "sitting",
      });

      expect(result.label).toBe("Sitting Meditation");
    });

    it("should return category label when no subcategory", () => {
      const result = getEntryDisplayProps({
        category: "mindfulness",
      });

      expect(result.label).toBe("Mindfulness");
    });

    it("should return 'Entry' when nothing provided", () => {
      const result = getEntryDisplayProps({});

      expect(result.label).toBe("Entry");
    });
  });

  describe("getSubcategoriesForCategory", () => {
    it("should return subcategories for valid category", () => {
      const result = getSubcategoriesForCategory("mindfulness");

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.slug).toBe("sitting");
    });

    it("should return empty array for invalid category", () => {
      const result = getSubcategoriesForCategory("nonexistent");

      expect(result).toEqual([]);
    });

    it("should return all subcategories for movement", () => {
      const result = getSubcategoriesForCategory("movement");

      expect(result.length).toBeGreaterThan(5);
      const slugs = result.map((s) => s.slug);
      expect(slugs).toContain("yoga");
      expect(slugs).toContain("running");
    });
  });

  describe("getSubcategoryEmoji", () => {
    it("should return subcategory emoji when found", () => {
      const result = getSubcategoryEmoji("mindfulness", "sitting");

      expect(result).toBe("🧘");
    });

    it("should return category emoji when subcategory not found", () => {
      const result = getSubcategoryEmoji("mindfulness", "nonexistent");

      expect(result).toBe("🧘");
    });

    it("should return default emoji when category not found", () => {
      const result = getSubcategoryEmoji("nonexistent", "sitting");

      expect(result).toBe(DEFAULT_EMOJI);
    });
  });
});
