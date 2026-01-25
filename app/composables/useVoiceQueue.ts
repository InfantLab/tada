/**
 * useVoiceQueue Composable
 * Handles offline voice recording queue with IndexedDB storage
 * @composable
 */

export interface QueuedVoiceItem {
  /** Unique ID for the queue item */
  id: string;
  /** Audio blob stored as ArrayBuffer */
  audioData: ArrayBuffer;
  /** MIME type of the audio */
  mimeType: string;
  /** Recording duration in ms */
  durationMs: number;
  /** Recording timestamp */
  recordedAt: number;
  /** Queue status */
  status: "pending" | "processing" | "failed";
  /** Number of retry attempts */
  retryCount: number;
  /** Last error message if failed */
  error?: string;
  /** Voice mode (journal or tada) */
  mode: "journal" | "tada";
}

interface VoiceQueueDB extends IDBDatabase {
  objectStoreNames: DOMStringList & { contains: (name: string) => boolean };
}

const DB_NAME = "tada_voice_queue";
const STORE_NAME = "voice_queue";
const DB_VERSION = 1;

export interface UseVoiceQueueReturn {
  /** Add recording to queue */
  addToQueue: (
    blob: Blob,
    durationMs: number,
    mode: "journal" | "tada",
  ) => Promise<string>;
  /** Get all queued items */
  getQueue: () => Promise<QueuedVoiceItem[]>;
  /** Get pending count */
  pendingCount: Ref<number>;
  /** Remove item from queue */
  removeFromQueue: (id: string) => Promise<void>;
  /** Update item status */
  updateStatus: (
    id: string,
    status: QueuedVoiceItem["status"],
    error?: string,
  ) => Promise<void>;
  /** Process all pending items */
  processQueue: () => Promise<void>;
  /** Retry a specific failed item */
  retryItem: (id: string) => Promise<void>;
  /** Whether currently processing */
  isProcessing: Ref<boolean>;
  /** Whether online */
  isOnline: Ref<boolean>;
  /** Event bus for notifications */
  onItemProcessed: (callback: (id: string, success: boolean) => void) => void;
}

/**
 * Open IndexedDB connection
 */
async function openDB(): Promise<VoiceQueueDB> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as VoiceQueueDB);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("recordedAt", "recordedAt", { unique: false });
      }
    };
  });
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Voice queue for offline recording support
 */
export function useVoiceQueue(): UseVoiceQueueReturn {
  const pendingCount = ref(0);
  const isProcessing = ref(false);
  const isOnline = ref(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Callbacks for item processed notifications
  const processedCallbacks: Array<(id: string, success: boolean) => void> = [];

  /**
   * Register callback for when items are processed
   */
  function onItemProcessed(
    callback: (id: string, success: boolean) => void,
  ): void {
    processedCallbacks.push(callback);
  }

  /**
   * Notify all registered callbacks
   */
  function notifyItemProcessed(id: string, success: boolean): void {
    for (const callback of processedCallbacks) {
      try {
        callback(id, success);
      } catch (err) {
        console.error("Error in queue notification callback:", err);
      }
    }
  }

  // Track online/offline status
  if (typeof window !== "undefined") {
    const handleOnline = () => {
      isOnline.value = true;
      // Process queue when coming online
      processQueue();
    };
    const handleOffline = () => {
      isOnline.value = false;
    };

    onMounted(() => {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      // Refresh pending count on mount
      refreshPendingCount();
    });

    onUnmounted(() => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    });
  }

  /**
   * Refresh pending count from database
   */
  async function refreshPendingCount(): Promise<void> {
    try {
      const items = await getQueue();
      pendingCount.value = items.filter((i) => i.status === "pending").length;
    } catch {
      pendingCount.value = 0;
    }
  }

  /**
   * Add a recording to the offline queue
   */
  async function addToQueue(
    blob: Blob,
    durationMs: number,
    mode: "journal" | "tada",
  ): Promise<string> {
    const db = await openDB();
    const id = generateId();

    // Convert blob to ArrayBuffer for storage
    const audioData = await blob.arrayBuffer();

    const item: QueuedVoiceItem = {
      id,
      audioData,
      mimeType: blob.type,
      durationMs,
      recordedAt: Date.now(),
      status: "pending",
      retryCount: 0,
      mode,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(item);

      request.onsuccess = () => {
        pendingCount.value++;
        resolve(id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all items from the queue
   */
  async function getQueue(): Promise<QueuedVoiceItem[]> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove an item from the queue
   */
  async function removeFromQueue(id: string): Promise<void> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        refreshPendingCount();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update item status
   */
  async function updateStatus(
    id: string,
    status: QueuedVoiceItem["status"],
    error?: string,
  ): Promise<void> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result as QueuedVoiceItem | undefined;
        if (!item) {
          reject(new Error("Item not found"));
          return;
        }

        item.status = status;
        if (error) item.error = error;
        if (status === "failed") item.retryCount++;

        const putRequest = store.put(item);
        putRequest.onsuccess = () => {
          refreshPendingCount();
          resolve();
        };
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Process all pending items in the queue
   */
  async function processQueue(): Promise<void> {
    if (!isOnline.value || isProcessing.value) return;

    isProcessing.value = true;

    try {
      const items = await getQueue();
      const pendingItems = items.filter(
        (i) =>
          i.status === "pending" || (i.status === "failed" && i.retryCount < 3),
      );

      for (const item of pendingItems) {
        await updateStatus(item.id, "processing");

        try {
          // Reconstruct blob from ArrayBuffer
          const blob = new Blob([item.audioData], { type: item.mimeType });

          // Get transcription composable
          const transcription = useTranscription();
          const result = await transcription.transcribe(blob);

          if (result) {
            // Get entry save composable
            const { createVoiceEntry, createBatchTadas } = useEntrySave();
            const llmStructure = useLLMStructure();

            if (item.mode === "tada") {
              // Extract tadas
              const extraction = await llmStructure.extractTadas(result.text);
              if (extraction && extraction.tadas.length > 0) {
                await createBatchTadas(extraction.tadas, item.id);
              }
            } else {
              // Create journal entry
              await createVoiceEntry(result.text, {
                transcription: result.text,
                sttProvider: result.provider,
                confidence: result.confidence,
                recordingDurationMs: item.durationMs,
              });
            }

            // Remove from queue on success
            await removeFromQueue(item.id);
            notifyItemProcessed(item.id, true);
          } else {
            throw new Error("Transcription failed");
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          await updateStatus(item.id, "failed", message);
          notifyItemProcessed(item.id, false);
        }
      }
    } finally {
      isProcessing.value = false;
      await refreshPendingCount();
    }
  }

  /**
   * Retry a specific failed item
   */
  async function retryItem(id: string): Promise<void> {
    // Reset status to pending so it will be picked up by processQueue
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result as QueuedVoiceItem | undefined;
        if (!item) {
          reject(new Error("Item not found"));
          return;
        }

        // Reset to pending status for retry
        item.status = "pending";
        item.error = undefined;

        const putRequest = store.put(item);
        putRequest.onsuccess = async () => {
          await refreshPendingCount();
          // Trigger processing if online
          if (isOnline.value) {
            processQueue();
          }
          resolve();
        };
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  return {
    addToQueue,
    getQueue,
    pendingCount,
    removeFromQueue,
    updateStatus,
    processQueue,
    retryItem,
    isProcessing,
    isOnline,
    onItemProcessed,
  };
}
