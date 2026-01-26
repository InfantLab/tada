/**
 * useEntryEngine - Unified composable for the entry engine
 *
 * This is the new unified entry system that should be used for all entry creation.
 * It provides:
 * - Validation via Zod schemas
 * - Conflict detection for timed entries
 * - Draft entry management
 * - Activity suggestions
 * - Natural language parsing
 *
 * @module composables/useEntryEngine
 */

import type { Entry } from "~/server/db/schema";
import type {
  EntryInput,
  EntryType,
  ConflictResult,
  ConflictResolution,
  DraftEntry,
  ActivitySuggestion,
} from "~/utils/entrySchemas";
import { validateEntryInput } from "~/utils/entrySchemas";
import { resolveEmojiForNewEntry } from "~/utils/categoryDefaults";
import {
  parseNaturalLanguage,
  type ParsedEntry,
} from "~/utils/naturalLanguageParser";

// =============================================================================
// Types
// =============================================================================

export interface CreateEntryOptions {
  /** How to handle time conflicts */
  resolution?: ConflictResolution;
  /** Skip emoji resolution (use provided emoji as-is) */
  skipEmojiResolution?: boolean;
  /** Skip conflict checking */
  skipConflictCheck?: boolean;
}

export interface SaveDraftOptions {
  /** Original text if from voice */
  parsedFrom?: string;
  /** Parsing confidence */
  confidence?: number;
  /** Custom expiry (default: 24 hours) */
  expiresInHours?: number;
}

// =============================================================================
// Composable
// =============================================================================

export function useEntryEngine() {
  const toast = useToast();
  const preferences = usePreferences();

  // State
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const drafts = ref<DraftEntry[]>([]);

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate entry input without saving
   */
  function validateInput(input: unknown): { valid: boolean; errors: string[] } {
    return validateEntryInput(input);
  }

  // ==========================================================================
  // Entry Creation
  // ==========================================================================

  /**
   * Create a new entry
   */
  async function createEntry(
    input: EntryInput,
    options: CreateEntryOptions = {},
  ): Promise<Entry | null> {
    isLoading.value = true;
    error.value = null;

    try {
      // Validate input
      const validation = validateInput(input);
      if (!validation.valid) {
        error.value = validation.errors.join("; ");
        toast.error(validation.errors[0] ?? "Invalid entry data");
        return null;
      }

      // Resolve emoji if not skipped
      let emoji = input.emoji;
      if (!options.skipEmojiResolution && !emoji && input.category) {
        emoji = resolveEmojiForNewEntry(
          input.category,
          input.subcategory ?? "",
          preferences.preferences.value.customEmojis ?? {},
        );
      }

      // Prepare input with resolved emoji
      const preparedInput = {
        ...input,
        emoji,
      };

      // Create entry via API - server returns the entry directly
      const entry = await $fetch<Entry>("/api/entries", {
        method: "POST",
        body: {
          ...preparedInput,
          resolution: options.resolution,
          skipConflictCheck: options.skipConflictCheck,
        },
      });

      // If we got an entry back, it was successful
      if (entry && entry.id) {
        toast.success(`${input.name} saved successfully`);
        return entry;
      }

      // Shouldn't reach here if server works correctly, but handle edge case
      error.value = "Failed to create entry - no entry returned";
      toast.error("Failed to create entry", {
        details: `Type: ${input.type}, Name: ${input.name}, Category: ${input.category || "none"}`,
      });
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      error.value = message;

      // Include more context in the toast for debugging
      const details = [
        `Type: ${input.type}`,
        `Name: ${input.name}`,
        input.category ? `Category: ${input.category}` : null,
        input.durationSeconds ? `Duration: ${input.durationSeconds}s` : null,
        input.count ? `Count: ${input.count}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      toast.error(message, { details });
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // ==========================================================================
  // Convenience Methods
  // ==========================================================================

  /**
   * Create a timed entry
   */
  async function createTimedEntry(
    input: Omit<EntryInput, "type"> & { durationSeconds: number },
    options?: CreateEntryOptions,
  ): Promise<Entry | null> {
    return createEntry({ ...input, type: "timed" }, options);
  }

  /**
   * Create a tally entry
   */
  async function createTallyEntry(
    input: Omit<EntryInput, "type"> & { count: number },
    options?: CreateEntryOptions,
  ): Promise<Entry | null> {
    return createEntry({ ...input, type: "tally" }, options);
  }

  /**
   * Create a moment entry
   */
  async function createMomentEntry(
    input: Omit<EntryInput, "type">,
    options?: CreateEntryOptions,
  ): Promise<Entry | null> {
    return createEntry({ ...input, type: "moment" }, options);
  }

  /**
   * Create a tada entry
   */
  async function createTadaEntry(
    input: Omit<EntryInput, "type">,
    options?: CreateEntryOptions,
  ): Promise<Entry | null> {
    return createEntry({ ...input, type: "tada" }, options);
  }

  // ==========================================================================
  // Conflict Detection
  // ==========================================================================

  /**
   * Check for conflicts without saving
   */
  async function checkConflicts(input: EntryInput): Promise<ConflictResult> {
    try {
      const result = await $fetch<ConflictResult>("/api/entries/validate", {
        method: "POST",
        body: { input, checkConflicts: true },
      });
      return result;
    } catch {
      // On error, assume no conflicts
      return {
        hasConflict: false,
        overlappingEntries: [],
        suggestedResolution: "allow",
      };
    }
  }

  // ==========================================================================
  // Draft Management
  // ==========================================================================

  /**
   * Save a draft entry
   */
  async function saveDraft(
    input: Partial<EntryInput>,
    options?: SaveDraftOptions,
  ): Promise<DraftEntry | null> {
    try {
      const result = await $fetch<{ draft: DraftEntry }>(
        "/api/entries/drafts",
        {
          method: "POST",
          body: {
            input,
            parsedFrom: options?.parsedFrom,
            confidence: options?.confidence,
            expiresInHours: options?.expiresInHours,
          },
        },
      );

      // Update local drafts list
      await loadDrafts();

      return result.draft;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save draft";
      toast.error(message);
      return null;
    }
  }

  /**
   * Load user's draft entries
   */
  async function loadDrafts(): Promise<void> {
    try {
      const result = await $fetch<{ drafts: DraftEntry[] }>(
        "/api/entries/drafts",
      );
      drafts.value = result.drafts;
    } catch {
      drafts.value = [];
    }
  }

  /**
   * Commit a draft to a real entry
   */
  async function commitDraft(
    draftId: string,
    input: EntryInput,
  ): Promise<Entry | null> {
    try {
      const result = await $fetch<{ success: boolean; entry?: Entry }>(
        `/api/entries/drafts/${draftId}/commit`,
        {
          method: "POST",
          body: { input },
        },
      );

      if (result.success && result.entry) {
        await loadDrafts();
        toast.success("Draft saved as entry");
        return result.entry;
      }

      return null;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to commit draft";
      toast.error(message);
      return null;
    }
  }

  /**
   * Discard a draft
   */
  async function discardDraft(draftId: string): Promise<void> {
    try {
      await $fetch(`/api/entries/drafts/${draftId}`, {
        method: "DELETE",
      });
      await loadDrafts();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to discard draft";
      toast.error(message);
    }
  }

  // ==========================================================================
  // Natural Language Parsing
  // ==========================================================================

  /**
   * Parse natural language text to entry input
   */
  function parseText(text: string): ParsedEntry {
    return parseNaturalLanguage(text);
  }

  /**
   * Parse text via API (for LLM-enhanced parsing)
   */
  async function parseTextAdvanced(text: string): Promise<ParsedEntry> {
    try {
      const result = await $fetch<ParsedEntry>("/api/entries/parse", {
        method: "POST",
        body: { text },
      });
      return result;
    } catch {
      // Fall back to local parsing
      return parseNaturalLanguage(text);
    }
  }

  // ==========================================================================
  // Activity Suggestions
  // ==========================================================================

  /**
   * Get activity suggestions for autocomplete
   */
  async function getSuggestions(
    query: string,
    entryType?: EntryType,
  ): Promise<ActivitySuggestion[]> {
    if (!query || query.length < 2) return [];

    try {
      const result = await $fetch<{ suggestions: ActivitySuggestion[] }>(
        "/api/entries/suggestions",
        {
          params: { q: query, type: entryType },
        },
      );
      return result.suggestions;
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // Recent Values
  // ==========================================================================

  /**
   * Get user's recently used durations
   */
  async function getRecentDurations(): Promise<number[]> {
    try {
      const result = await $fetch<{ durations: number[] }>(
        "/api/durations/recent",
      );
      return result.durations;
    } catch {
      return [];
    }
  }

  /**
   * Get user's recently used counts
   */
  async function getRecentCounts(): Promise<number[]> {
    try {
      const result = await $fetch<{ counts: number[] }>("/api/counts/recent");
      return result.counts;
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    drafts: readonly(drafts),

    // Validation
    validateInput,

    // Entry Creation
    createEntry,
    createTimedEntry,
    createTallyEntry,
    createMomentEntry,
    createTadaEntry,

    // Conflict Detection
    checkConflicts,

    // Draft Management
    saveDraft,
    loadDrafts,
    commitDraft,
    discardDraft,

    // Natural Language
    parseText,
    parseTextAdvanced,

    // Suggestions
    getSuggestions,

    // Recent Values
    getRecentDurations,
    getRecentCounts,
  };
}
