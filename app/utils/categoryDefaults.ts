/**
 * Category Defaults - Emojis, colors, and subcategories
 * See design/ontology.md for full documentation
 */

export interface CategoryDefinition {
  emoji: string;
  color: string;
  label: string;
  subcategories: SubcategoryDefinition[];
  allowedForTimed?: boolean;
}

export interface SubcategoryDefinition {
  slug: string;
  emoji: string;
  label: string;
}

export const CATEGORY_DEFAULTS: Record<string, CategoryDefinition> = {
  mindfulness: {
    emoji: "🧘",
    color: "#7C3AED",
    label: "Mindfulness",
    allowedForTimed: true,
    subcategories: [
      { slug: "sitting", emoji: "🧘", label: "Sitting Meditation" },
      { slug: "breathing", emoji: "🫁", label: "Breathing Exercise" },
      { slug: "walking", emoji: "🚶", label: "Walking Meditation" },
      { slug: "body_scan", emoji: "🫀", label: "Body Scan" },
      { slug: "loving_kindness", emoji: "💗", label: "Loving-Kindness" },
      { slug: "prayer", emoji: "🙏", label: "Prayer" },
      { slug: "visualization", emoji: "🌈", label: "Visualization" },
    ],
  },
  movement: {
    emoji: "🏃",
    color: "#059669",
    label: "Movement",
    allowedForTimed: true,
    subcategories: [
      { slug: "yoga", emoji: "🧘‍♀️", label: "Yoga" },
      { slug: "tai_chi", emoji: "🥋", label: "Tai Chi" },
      { slug: "running", emoji: "🏃", label: "Running" },
      { slug: "walking", emoji: "🚶", label: "Walking" },
      { slug: "cycling", emoji: "🚴", label: "Cycling" },
      { slug: "strength", emoji: "💪", label: "Strength Training" },
      { slug: "gym", emoji: "🏋️", label: "Gym" },
      { slug: "swimming", emoji: "🏊", label: "Swimming" },
      { slug: "dance", emoji: "💃", label: "Dance" },
    ],
  },
  creative: {
    emoji: "🎵",
    color: "#D97706",
    label: "Creative",
    allowedForTimed: true,
    subcategories: [
      { slug: "music", emoji: "🎵", label: "Music Practice" },
      { slug: "piano", emoji: "🎹", label: "Piano" },
      { slug: "guitar", emoji: "🎸", label: "Guitar" },
      { slug: "singing", emoji: "🎤", label: "Singing" },
      { slug: "art", emoji: "🎨", label: "Art" },
      { slug: "writing", emoji: "✍️", label: "Writing" },
      { slug: "coding", emoji: "💻", label: "Coding" },
      { slug: "crafts", emoji: "🧶", label: "Crafts" },
    ],
  },
  learning: {
    emoji: "📚",
    color: "#2563EB",
    label: "Learning",
    allowedForTimed: true,
    subcategories: [
      { slug: "lesson", emoji: "📚", label: "Lesson" },
      { slug: "reading", emoji: "📖", label: "Reading" },
      { slug: "language", emoji: "🗣️", label: "Language" },
      { slug: "course", emoji: "🎓", label: "Course" },
      { slug: "practice", emoji: "🎯", label: "Practice" },
    ],
  },
  journal: {
    emoji: "📝",
    color: "#6366F1",
    label: "Journal",
    subcategories: [
      { slug: "dream", emoji: "🌙", label: "Dream" },
      { slug: "gratitude", emoji: "🙏", label: "Gratitude" },
      { slug: "reflection", emoji: "💭", label: "Reflection" },
      { slug: "note", emoji: "📝", label: "Note" },
      { slug: "serendipity", emoji: "✨", label: "Serendipity" },
      { slug: "memory", emoji: "📸", label: "Memory" },
    ],
  },
  accomplishment: {
    emoji: "⚡",
    color: "#F59E0B",
    label: "Accomplishment",
    subcategories: [
      { slug: "home", emoji: "🏠", label: "Home" },
      { slug: "work", emoji: "💼", label: "Work" },
      { slug: "personal", emoji: "🎯", label: "Personal" },
      { slug: "hobby", emoji: "🎨", label: "Hobby" },
      { slug: "social", emoji: "👫", label: "Social" },
      { slug: "health", emoji: "💚", label: "Health" },
    ],
  },
  events: {
    emoji: "🎭",
    color: "#EC4899",
    label: "Events",
    subcategories: [
      { slug: "concert", emoji: "🎵", label: "Concert" },
      { slug: "movie", emoji: "🎬", label: "Movie" },
      { slug: "theatre", emoji: "🎭", label: "Theatre" },
      { slug: "exhibition", emoji: "🖼️", label: "Exhibition" },
      { slug: "talk", emoji: "🎤", label: "Talk" },
      { slug: "sports", emoji: "🏟️", label: "Sports Event" },
    ],
  },
};

// Flat lookup for subcategories (any category)
// Note: Some subcategories exist in multiple categories (e.g., walking)
// This lookup returns first match - prefer getSubcategoryInCategory() when category is known
export const SUBCATEGORY_DEFAULTS: Record<
  string,
  { emoji: string; label: string; category: string }
> = {};

// Build the flat lookup
for (const [categorySlug, category] of Object.entries(CATEGORY_DEFAULTS)) {
  for (const subcat of category.subcategories) {
    // If same slug exists in multiple categories, first one wins
    if (!SUBCATEGORY_DEFAULTS[subcat.slug]) {
      SUBCATEGORY_DEFAULTS[subcat.slug] = {
        emoji: subcat.emoji,
        label: subcat.label,
        category: categorySlug,
      };
    }
  }
}

// Default fallbacks
export const DEFAULT_EMOJI = "📌";
export const DEFAULT_COLOR = "#6B7280";

/**
 * Get display properties for an entry
 */
export function getEntryDisplayProps(entry: {
  emoji?: string | null;
  category?: string | null;
  subcategory?: string | null;
}): { emoji: string; color: string; label: string } {
  const emoji =
    entry.emoji ||
    (entry.subcategory && SUBCATEGORY_DEFAULTS[entry.subcategory]?.emoji) ||
    (entry.category && CATEGORY_DEFAULTS[entry.category]?.emoji) ||
    DEFAULT_EMOJI;

  const color =
    (entry.category && CATEGORY_DEFAULTS[entry.category]?.color) ||
    DEFAULT_COLOR;

  const label =
    (entry.subcategory && SUBCATEGORY_DEFAULTS[entry.subcategory]?.label) ||
    (entry.category && CATEGORY_DEFAULTS[entry.category]?.label) ||
    "Entry";

  return { emoji, color, label };
}

/**
 * Get subcategories for a specific category
 */
export function getSubcategoriesForCategory(
  category: string
): SubcategoryDefinition[] {
  return CATEGORY_DEFAULTS[category]?.subcategories || [];
}

/**
 * Get emoji for a subcategory within a specific category context
 */
export function getSubcategoryEmoji(
  category: string,
  subcategory: string
): string {
  const cat = CATEGORY_DEFAULTS[category];
  if (!cat) return DEFAULT_EMOJI;

  const subcat = cat.subcategories.find((s) => s.slug === subcategory);
  return subcat?.emoji || cat.emoji;
}

/**
 * Get category info by slug
 */
export function getCategoryInfo(
  category: string
): CategoryDefinition | undefined {
  return CATEGORY_DEFAULTS[category];
}

/**
 * Get subcategory within a specific category (avoids collision)
 */
export function getSubcategoryInCategory(
  category: string,
  subcategory: string
): SubcategoryDefinition | undefined {
  const cat = CATEGORY_DEFAULTS[category];
  return cat?.subcategories.find((s) => s.slug === subcategory);
}

/**
 * Get all categories allowed for timed activities
 */
export function getTimedCategories(): string[] {
  return Object.keys(CATEGORY_DEFAULTS).filter(
    (key) => CATEGORY_DEFAULTS[key]?.allowedForTimed
  );
}

/**
 * Get entry timestamp with fallback priority
 */
export function getEntryTimestamp(entry: {
  timestamp?: string | null;
  startedAt?: string | null;
  date?: string | null;
  createdAt?: string | null;
}): string {
  return (
    entry.timestamp ||
    entry.startedAt ||
    entry.date ||
    entry.createdAt ||
    new Date().toISOString()
  );
}

/**
 * Get all category slugs
 */
export function getCategorySlugs(): string[] {
  return Object.keys(CATEGORY_DEFAULTS);
}
