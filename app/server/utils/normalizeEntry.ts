/**
 * Entry Normalization Utilities
 *
 * Provides backward compatibility for legacy type/category names.
 * Maps old ontology names to new v0.3.0 names:
 * - journal → moment (type)
 * - reps → tally (type)
 * - journal → moments (category)
 * - note → journal (subcategory)
 *
 * @module server/utils/normalizeEntry
 */

/**
 * Normalize entry type from legacy to current naming
 * @param type - The entry type to normalize
 * @returns The normalized type name
 */
export function normalizeEntryType(type: string): string {
  if (type === "journal") return "moment";
  if (type === "reps") return "tally";
  return type;
}

/**
 * Normalize category from legacy to current naming
 * @param category - The category to normalize
 * @returns The normalized category name
 */
export function normalizeCategory(category: string): string {
  if (category === "journal") return "moments";
  return category;
}

/**
 * Normalize subcategory from legacy to current naming
 * @param subcategory - The subcategory to normalize
 * @returns The normalized subcategory name
 */
export function normalizeSubcategory(subcategory: string): string {
  if (subcategory === "note") return "journal";
  return subcategory;
}

/**
 * Normalize an entry object's type, category, and subcategory
 * @param entry - The entry object to normalize (mutates in place)
 * @returns The same entry object with normalized fields
 */
export function normalizeEntry<
  T extends {
    type?: string;
    category?: string | null;
    subcategory?: string | null;
  },
>(entry: T): T {
  if (entry.type) {
    entry.type = normalizeEntryType(entry.type);
  }
  if (entry.category) {
    entry.category = normalizeCategory(entry.category);
  }
  if (entry.subcategory) {
    entry.subcategory = normalizeSubcategory(entry.subcategory);
  }
  return entry;
}

/**
 * Check if a type is a legacy type name that needs migration
 */
export function isLegacyType(type: string): boolean {
  return type === "journal" || type === "reps";
}

/**
 * Check if a category is a legacy category name that needs migration
 */
export function isLegacyCategory(category: string): boolean {
  return category === "journal";
}

/**
 * Check if a subcategory is a legacy subcategory name that needs migration
 */
export function isLegacySubcategory(subcategory: string): boolean {
  return subcategory === "note";
}
