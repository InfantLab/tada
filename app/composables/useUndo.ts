/**
 * Undo Composable
 * Manages client-side deletion buffer with expiry for undo functionality
 */

export interface UndoItem {
  id: string;
  type: "entry" | "preset" | "recipe";
  data: unknown;
  deletedAt: number;
  expiresAt: number;
}

interface UndoOptions {
  /** Duration in milliseconds before undo expires (default: 5000ms) */
  expiry?: number;
  /** Callback when item expires and is permanently deleted */
  onExpire?: (item: UndoItem) => Promise<void>;
}

const DEFAULT_EXPIRY = 5000; // 5 seconds

const undoStack = ref<UndoItem[]>([]);
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useUndo = (options: UndoOptions = {}) => {
  const expiry = options.expiry ?? DEFAULT_EXPIRY;

  /**
   * Add an item to the undo stack
   * Returns true if successful
   */
  const addToUndo = (
    id: string,
    type: UndoItem["type"],
    data: unknown
  ): boolean => {
    const now = Date.now();
    const item: UndoItem = {
      id,
      type,
      data,
      deletedAt: now,
      expiresAt: now + expiry,
    };

    // Remove any existing item with same id
    undoStack.value = undoStack.value.filter((i) => i.id !== id);

    // Add new item
    undoStack.value.push(item);

    // Set timer for expiry
    const timer = setTimeout(async () => {
      const expired = undoStack.value.find((i) => i.id === id);
      if (expired) {
        undoStack.value = undoStack.value.filter((i) => i.id !== id);
        activeTimers.delete(id);

        if (options.onExpire) {
          await options.onExpire(expired);
        }
      }
    }, expiry);

    // Clear any existing timer for this id
    const existingTimer = activeTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    activeTimers.set(id, timer);

    return true;
  };

  /**
   * Undo (restore) an item by id
   * Returns the item data if found, null otherwise
   */
  const undo = (id: string): unknown | null => {
    const index = undoStack.value.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const item = undoStack.value[index];
    if (!item) return null;

    // Remove from stack
    undoStack.value.splice(index, 1);

    // Clear timer
    const timer = activeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      activeTimers.delete(id);
    }

    return item.data;
  };

  /**
   * Get the most recent undoable item
   */
  const getLastUndoable = (): UndoItem | null => {
    if (undoStack.value.length === 0) return null;
    const lastItem = undoStack.value[undoStack.value.length - 1];
    if (!lastItem) return null;
    return lastItem;
  };

  /**
   * Check if an item can be undone
   */
  const canUndo = (id: string): boolean => {
    return undoStack.value.some((i) => i.id === id);
  };

  /**
   * Get remaining time in ms for an undoable item
   */
  const getRemainingTime = (id: string): number => {
    const item = undoStack.value.find((i) => i.id === id);
    if (!item) return 0;
    return Math.max(0, item.expiresAt - Date.now());
  };

  /**
   * Cancel undo (permanently delete without restoring)
   */
  const cancelUndo = async (id: string): Promise<boolean> => {
    const item = undoStack.value.find((i) => i.id === id);
    if (!item) return false;

    // Remove from stack
    undoStack.value = undoStack.value.filter((i) => i.id !== id);

    // Clear timer
    const timer = activeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      activeTimers.delete(id);
    }

    // Execute expiry callback (permanent delete)
    if (options.onExpire) {
      await options.onExpire(item);
    }

    return true;
  };

  /**
   * Clear all undoable items (triggers expiry for all)
   */
  const clearAll = async (): Promise<void> => {
    // Clear all timers
    for (const timer of activeTimers.values()) {
      clearTimeout(timer);
    }
    activeTimers.clear();

    // Trigger expiry for all items
    if (options.onExpire) {
      for (const item of undoStack.value) {
        await options.onExpire(item);
      }
    }

    undoStack.value = [];
  };

  /**
   * Get count of items in undo stack
   */
  const undoCount = computed(() => undoStack.value.length);

  /**
   * Check if there are any undoable items
   */
  const hasUndoable = computed(() => undoStack.value.length > 0);

  return {
    undoStack: readonly(undoStack),
    undoCount,
    hasUndoable,
    addToUndo,
    undo,
    getLastUndoable,
    canUndo,
    getRemainingTime,
    cancelUndo,
    clearAll,
  };
};
