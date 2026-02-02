/**
 * useEntrySave - Unified composable for creating and updating entries
 *
 * Provides consistent:
 * - Validation
 * - Emoji resolution
 * - Toast notifications
 * - Error handling
 * - Loading states
 */

import type { Entry } from "~/server/db/schema";
import { resolveEmojiForNewEntry } from "~/utils/categoryDefaults";

export interface EntryData {
  // Required for creation
  type: string;
  name: string;

  // Classification
  category?: string | null;
  subcategory?: string | null;
  emoji?: string | null;

  // Timeline
  timestamp?: string;
  durationSeconds?: number | null;
  timezone?: string;

  // Content
  data?: Record<string, unknown>;
  tags?: string[];
  notes?: string | null;

  // Import tracking (usually not set by user)
  source?: string;
  externalId?: string | null;
}

/**
 * Input for batch tada creation from extraction
 */
export interface BatchTadaInput {
  /** Tada title */
  title: string;
  /** Category (life domain: work, health, social, life_admin, etc.) */
  category: string;
  /** Subcategory (optional, more specific: cleaning, sleep, family, etc.) */
  subcategory?: string | null;
  /** Significance level */
  significance: "minor" | "normal" | "major";
  /** Original text from transcription */
  originalText?: string;
  /** Additional notes/context */
  notes?: string;
  /** Extraction confidence */
  confidence: number;
}

export interface SaveOptions {
  /** Skip emoji resolution (use provided emoji as-is) */
  skipEmojiResolution?: boolean;
  /** Custom success message */
  successMessage?: string;
  /** Navigate to this path on success */
  navigateTo?: string;
  /** Show success toast (default: true) */
  showSuccessToast?: boolean;
  /** Override subcategory for voice entries */
  subcategory?: string;
}

export interface UseEntrySaveReturn {
  /** Create multiple tadas from extraction */
  createBatchTadas: (
    tadas: BatchTadaInput[],
    extractionId: string,
    options?: SaveOptions,
  ) => Promise<Entry[]>;
  /** Update an existing entry */
  updateEntry: (
    id: string,
    data: Partial<EntryData>,
    options?: SaveOptions,
  ) => Promise<Entry | null>;
  /** Delete an entry */
  deleteEntry: (id: string, options?: SaveOptions) => Promise<boolean>;
  /** Loading state */
  isLoading: Ref<boolean>;
  /** Current error (cleared on next operation) */
  error: Ref<string | null>;
}

export const useEntrySave = (): UseEntrySaveReturn => {
  const { error: showError, success: showSuccess } = useToast();
  const { preferences } = usePreferences();
  const router = useRouter();

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Resolve emoji for entry based on category/subcategory and user preferences
   */
  const resolveEmoji = (
    category: string | null | undefined,
    subcategory: string | null | undefined,
    providedEmoji: string | null | undefined,
  ): string | null => {
    // If emoji explicitly provided, use it
    if (providedEmoji) return providedEmoji;

    // If we have category info, resolve from preferences/defaults
    if (category) {
      return resolveEmojiForNewEntry(
        category,
        subcategory || "",
        preferences.value.customEmojis,
      );
    }

    return null;
  };

  /**
   * Create multiple tadas from voice extraction in a batch
   */
  const createBatchTadas = async (
    tadas: BatchTadaInput[],
    extractionId: string,
    options: SaveOptions = {},
  ): Promise<Entry[]> => {
    if (tadas.length === 0) {
      return [];
    }

    error.value = null;
    isLoading.value = true;

    const created: Entry[] = [];
    const failed: string[] = [];

    try {
      // Create each tada sequentially to maintain order
      for (const tada of tadas) {
        const entryData: EntryData = {
          type: "tada",
          name: tada.title,
          category: tada.category, // Use the actual category from extraction
          subcategory: tada.subcategory || null, // Optional subcategory
          source: "voice",
          notes: tada.notes || null,
          data: {
            voice: {
              autoExtracted: true,
              extractedFrom: extractionId,
              originalText: tada.originalText,
              confidence: tada.confidence,
            },
            significance: tada.significance,
          },
        };

        try {
          const entry = await $fetch<Entry>("/api/entries", {
            method: "POST",
            body: {
              ...entryData,
              emoji: resolveEmoji(tada.category, tada.subcategory || "", null),
              timestamp: new Date().toISOString(),
            },
          });
          created.push(entry);
        } catch (err) {
          console.error(`Failed to create tada "${tada.title}":`, err);
          failed.push(tada.title);
        }
      }

      // Show success toast
      if (options.showSuccessToast !== false && created.length > 0) {
        const message =
          options.successMessage ||
          `${created.length} tada${created.length !== 1 ? "s" : ""} saved! 🎯`;
        showSuccess(message);
      }

      // Show warning if some failed
      if (failed.length > 0) {
        showError(`Failed to save ${failed.length} tada(s)`);
      }

      // Navigate if specified
      if (options.navigateTo && created.length > 0) {
        router.push(options.navigateTo);
      }

      return created;
    } catch (err) {
      console.error("Failed to create batch tadas:", err);
      const message =
        err instanceof Error ? err.message : "Failed to save tadas";
      error.value = message;
      showError(message);
      return created; // Return any that were created before failure
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Update an existing entry
   */
  const updateEntry = async (
    id: string,
    data: Partial<EntryData>,
    options: SaveOptions = {},
  ): Promise<Entry | null> => {
    error.value = null;

    if (!id) {
      error.value = "Entry ID is required";
      showError("Entry ID is required");
      return null;
    }

    isLoading.value = true;

    try {
      // For updates, only resolve emoji if category/subcategory changed AND no emoji provided
      const updateData = { ...data };

      // If emoji is being explicitly set, use it
      // If category/subcategory changed but no emoji, resolve new emoji
      if (
        !options.skipEmojiResolution &&
        !data.emoji &&
        (data.category !== undefined || data.subcategory !== undefined)
      ) {
        // Only resolve if we have category info
        if (data.category) {
          updateData.emoji = resolveEmoji(
            data.category,
            data.subcategory,
            null,
          );
        }
      }

      const updated = await $fetch<Entry>(`/api/entries/${id}`, {
        method: "PATCH",
        body: updateData,
      });

      // Show success toast
      if (options.showSuccessToast !== false) {
        const message = options.successMessage || "Changes saved!";
        showSuccess(message);
      }

      // Navigate if specified
      if (options.navigateTo) {
        router.push(options.navigateTo);
      }

      return updated;
    } catch (err: unknown) {
      console.error("Failed to update entry:", err);
      const message =
        err instanceof Error ? err.message : "Failed to save changes";
      error.value = message;
      showError(message);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Delete an entry
   */
  const deleteEntry = async (
    id: string,
    options: SaveOptions = {},
  ): Promise<boolean> => {
    error.value = null;

    if (!id) {
      error.value = "Entry ID is required";
      showError("Entry ID is required");
      return false;
    }

    isLoading.value = true;

    try {
      await $fetch<unknown>(`/api/entries/${id}`, {
        method: "DELETE",
      });

      // Show success toast
      if (options.showSuccessToast !== false) {
        const message = options.successMessage || "Entry deleted";
        showSuccess(message);
      }

      // Navigate if specified
      if (options.navigateTo) {
        router.push(options.navigateTo);
      }

      return true;
    } catch (err: unknown) {
      console.error("Failed to delete entry:", err);
      const message =
        err instanceof Error ? err.message : "Failed to delete entry";
      error.value = message;
      showError(message);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    createBatchTadas,
    updateEntry,
    deleteEntry,
    isLoading,
    error,
  };
};
