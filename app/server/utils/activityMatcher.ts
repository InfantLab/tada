/**
 * Activity name matching and normalization utilities
 *
 * Helps prevent activity fragmentation from typos, capitalization,
 * and plural variations.
 */

import { createLogger } from "~/utils/logger";

const logger = createLogger("utils:activityMatcher");

/**
 * Normalize an activity name for comparison
 * - Lowercase
 * - Trim whitespace
 * - Remove extra spaces
 */
export function normalizeActivityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching to detect typos
 */
export function levenshteinDistance(a: string, b: string): number {
  // Create matrix with known dimensions, pre-filled with zeros
  const rows = b.length + 1;
  const cols = a.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  );

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i]![0] = i;
  }
  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1, // insertion
          matrix[i - 1]![j]! + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Calculate similarity score (0-1) between two activity names
 * 1.0 = identical, 0.0 = completely different
 */
export function calculateSimilarity(name1: string, name2: string): number {
  const normalized1 = normalizeActivityName(name1);
  const normalized2 = normalizeActivityName(name2);

  // Exact match after normalization
  if (normalized1 === normalized2) {
    return 1.0;
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  // Convert distance to similarity score
  const similarity = 1 - distance / maxLength;

  return similarity;
}

/**
 * Check if two activity names are similar enough to be considered the same
 * Threshold: 0.8 (allows for 1-2 character differences)
 */
export function areActivitiesSimilar(
  name1: string,
  name2: string,
  threshold: number = 0.8,
): boolean {
  return calculateSimilarity(name1, name2) >= threshold;
}

/**
 * Find the best matching activity from a list
 * Returns null if no good match found
 */
export function findBestMatch(
  query: string,
  candidates: string[],
  threshold: number = 0.8,
): { name: string; similarity: number } | null {
  let bestMatch: { name: string; similarity: number } | null = null;

  for (const candidate of candidates) {
    const similarity = calculateSimilarity(query, candidate);

    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { name: candidate, similarity };
      }
    }
  }

  return bestMatch;
}

/**
 * Group activity names by similarity
 * Returns a map where keys are canonical names and values are variants
 */
export function groupSimilarActivities(
  names: string[],
  threshold: number = 0.85,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  const processed = new Set<string>();

  // Sort by length descending (prefer longer, more descriptive names as canonical)
  const sorted = [...names].sort((a, b) => b.length - a.length);

  for (const name of sorted) {
    if (processed.has(name)) continue;

    // This becomes the canonical name for the group
    const group: string[] = [name];
    processed.add(name);

    // Find similar names
    for (const otherName of sorted) {
      if (
        !processed.has(otherName) &&
        areActivitiesSimilar(name, otherName, threshold)
      ) {
        group.push(otherName);
        processed.add(otherName);
      }
    }

    groups.set(name, group);
  }

  logger.debug("Grouped similar activities", {
    originalCount: names.length,
    groupCount: groups.size,
  });

  return groups;
}
