/**
 * Content Hash Utility
 *
 * Computes a deterministic SHA-256 hash of an entry's content fields.
 * Used by the sync engine for cheap change detection without deep comparison.
 *
 * @module server/utils/contentHash
 */

import { createHash } from "node:crypto";

interface HashableEntry {
  name: string;
  type: string;
  category: string | null;
  subcategory: string | null;
  timestamp: string;
  durationSeconds: number | null;
  notes: string | null;
  tags: string[] | null;
  data: Record<string, unknown> | null;
}

/**
 * Compute a deterministic SHA-256 hash of an entry's content fields.
 * Only includes fields that represent user-visible content (not metadata
 * like createdAt, updatedAt, source, etc.).
 */
export function computeContentHash(entry: HashableEntry): string {
  const canonical = JSON.stringify({
    name: entry.name,
    type: entry.type,
    category: entry.category ?? null,
    subcategory: entry.subcategory ?? null,
    timestamp: entry.timestamp,
    durationSeconds: entry.durationSeconds ?? null,
    notes: entry.notes ?? null,
    tags: entry.tags ? [...entry.tags].sort() : [],
    data: entry.data ?? null,
  });

  return createHash("sha256").update(canonical).digest("hex");
}
