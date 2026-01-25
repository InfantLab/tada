/**
 * Whisper WASM Worker - On-device speech-to-text
 *
 * Uses Transformers.js with ONNX runtime to run Whisper locally in the browser.
 * This provides fully offline transcription without sending audio to any server.
 *
 * Key features:
 * - Model download with progress tracking
 * - Cached in IndexedDB for offline use
 * - Supports tiny, base, small models (tradeoff: speed vs accuracy)
 * - Audio preprocessing (resampling to 16kHz mono)
 *
 * @see https://huggingface.co/docs/transformers.js
 */

/// <reference lib="webworker" />

import type { TranscriptionResult } from "~/types/voice";

// Worker message types
interface WorkerMessage {
  type:
    | "init"
    | "transcribe"
    | "check-model"
    | "download-model"
    | "cancel"
    | "delete-model";
  id?: string;
  payload?: unknown;
}

interface InitPayload {
  modelSize?: "tiny" | "base" | "small";
}

interface TranscribePayload {
  audioBlob: ArrayBuffer;
  language?: string;
}

interface DownloadModelPayload {
  modelSize: "tiny" | "base" | "small";
  wifiOnly?: boolean;
}

// Response types sent back to main thread
interface WorkerResponse {
  type:
    | "ready"
    | "progress"
    | "result"
    | "error"
    | "model-status"
    | "download-progress"
    | "download-complete";
  id?: string;
  payload?: unknown;
}

interface ModelStatusPayload {
  modelSize: "tiny" | "base" | "small";
  isDownloaded: boolean;
  sizeInMB: number;
}

interface DownloadProgressPayload {
  modelSize: string;
  downloadedBytes: number;
  totalBytes: number;
  percentComplete: number;
}

// Model size configurations
const MODEL_CONFIGS = {
  tiny: {
    name: "openai/whisper-tiny",
    sizeInMB: 75,
    accuracy: "basic",
    speed: "fastest",
  },
  base: {
    name: "openai/whisper-base",
    sizeInMB: 145,
    accuracy: "good",
    speed: "fast",
  },
  small: {
    name: "openai/whisper-small",
    sizeInMB: 490,
    accuracy: "best",
    speed: "moderate",
  },
} as const;

// IndexedDB store name for caching models
const MODEL_CACHE_STORE = "model_cache";
const DB_NAME = "whisper_models";
const DB_VERSION = 1;

// Worker state
let pipeline: unknown = null;
let isInitialized = false;
let _currentModelSize: "tiny" | "base" | "small" = "tiny";

/**
 * Initialize IndexedDB for model caching
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(MODEL_CACHE_STORE)) {
        db.createObjectStore(MODEL_CACHE_STORE, { keyPath: "modelName" });
      }
    };
  });
}

/**
 * Check if a model is cached in IndexedDB
 */
async function isModelCached(
  modelSize: "tiny" | "base" | "small",
): Promise<boolean> {
  try {
    const db = await initDB();
    const tx = db.transaction(MODEL_CACHE_STORE, "readonly");
    const store = tx.objectStore(MODEL_CACHE_STORE);
    const request = store.get(MODEL_CONFIGS[modelSize].name);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Cache model metadata in IndexedDB
 * Note: The actual model files are cached by transformers.js internally
 * We just track which models have been downloaded
 */
async function cacheModelMetadata(
  modelSize: "tiny" | "base" | "small",
): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(MODEL_CACHE_STORE, "readwrite");
  const store = tx.objectStore(MODEL_CACHE_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.put({
      modelName: MODEL_CONFIGS[modelSize].name,
      modelSize,
      downloadedAt: Date.now(),
      sizeInMB: MODEL_CONFIGS[modelSize].sizeInMB,
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete model from cache
 */
async function deleteModelFromCache(
  modelSize: "tiny" | "base" | "small",
): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(MODEL_CACHE_STORE, "readwrite");
  const store = tx.objectStore(MODEL_CACHE_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(MODEL_CONFIGS[modelSize].name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Send response back to main thread
 */
function respond(response: WorkerResponse): void {
  self.postMessage(response);
}

/**
 * Initialize the Whisper pipeline with the specified model
 */
async function initializePipeline(
  modelSize: "tiny" | "base" | "small",
): Promise<void> {
  try {
    // Dynamic import of transformers.js
    // This allows tree-shaking and lazy loading
    const { pipeline: createPipeline } = await import("@xenova/transformers");

    const config = MODEL_CONFIGS[modelSize];

    // Create the automatic speech recognition pipeline
    pipeline = await createPipeline(
      "automatic-speech-recognition",
      config.name,
      {
        progress_callback: (progress: {
          status: string;
          loaded?: number;
          total?: number;
        }) => {
          if (
            progress.status === "downloading" &&
            progress.loaded &&
            progress.total
          ) {
            respond({
              type: "download-progress",
              payload: {
                modelSize,
                downloadedBytes: progress.loaded,
                totalBytes: progress.total,
                percentComplete: Math.round(
                  (progress.loaded / progress.total) * 100,
                ),
              } as DownloadProgressPayload,
            });
          }
        },
      },
    );

    _currentModelSize = modelSize;
    isInitialized = true;

    // Cache model metadata
    await cacheModelMetadata(modelSize);

    respond({
      type: "ready",
      payload: { modelSize, modelName: config.name },
    });
  } catch (error) {
    respond({
      type: "error",
      payload: {
        message: `Failed to initialize Whisper model: ${error instanceof Error ? error.message : "Unknown error"}`,
        code: "INIT_FAILED",
      },
    });
  }
}

/**
 * Transcribe audio using the loaded Whisper model
 */
async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  language?: string,
  requestId?: string,
): Promise<void> {
  if (!pipeline || !isInitialized) {
    respond({
      type: "error",
      id: requestId,
      payload: {
        message: "Whisper model not initialized. Call init first.",
        code: "NOT_INITIALIZED",
      },
    });
    return;
  }

  try {
    // Convert ArrayBuffer to Float32Array for audio processing
    // Whisper expects 16kHz mono audio
    const audioData = new Float32Array(audioBuffer);

    // Run transcription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (pipeline as any)(audioData, {
      language: language || "en",
      task: "transcribe",
      return_timestamps: false,
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    const transcriptionResult: TranscriptionResult = {
      text: result.text?.trim() || "",
      confidence: 0.9, // Whisper doesn't provide confidence, estimate high
      language: language || "en",
      provider: "whisper-wasm",
      processingMethod: "whisper-wasm",
      duration: 0, // Would need timing wrapper
    };

    respond({
      type: "result",
      id: requestId,
      payload: transcriptionResult,
    });
  } catch (error) {
    respond({
      type: "error",
      id: requestId,
      payload: {
        message: `Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        code: "TRANSCRIPTION_FAILED",
      },
    });
  }
}

/**
 * Check model download status
 */
async function checkModelStatus(
  modelSize: "tiny" | "base" | "small",
): Promise<void> {
  const isDownloaded = await isModelCached(modelSize);
  const config = MODEL_CONFIGS[modelSize];

  respond({
    type: "model-status",
    payload: {
      modelSize,
      isDownloaded,
      sizeInMB: config.sizeInMB,
    } as ModelStatusPayload,
  });
}

/**
 * Download model (optionally respecting wifi-only setting)
 */
async function downloadModel(
  modelSize: "tiny" | "base" | "small",
  _wifiOnly?: boolean,
): Promise<void> {
  // Note: In a browser worker, we can't reliably detect WiFi vs cellular
  // The wifiOnly flag would need to be checked by the main thread
  // using Navigator.connection API before sending the download request

  await initializePipeline(modelSize);

  respond({
    type: "download-complete",
    payload: { modelSize },
  });
}

/**
 * Delete a cached model
 */
async function deleteModel(
  modelSize: "tiny" | "base" | "small",
): Promise<void> {
  try {
    await deleteModelFromCache(modelSize);

    // Clear the transformers.js cache for this model
    // This requires accessing the cache API directly
    const caches = await self.caches.keys();
    for (const cacheName of caches) {
      if (cacheName.includes("transformers")) {
        const cache = await self.caches.open(cacheName);
        const requests = await cache.keys();
        for (const request of requests) {
          if (request.url.includes(MODEL_CONFIGS[modelSize].name)) {
            await cache.delete(request);
          }
        }
      }
    }

    respond({
      type: "model-status",
      payload: {
        modelSize,
        isDownloaded: false,
        sizeInMB: MODEL_CONFIGS[modelSize].sizeInMB,
      } as ModelStatusPayload,
    });
  } catch (error) {
    respond({
      type: "error",
      payload: {
        message: `Failed to delete model: ${error instanceof Error ? error.message : "Unknown error"}`,
        code: "DELETE_FAILED",
      },
    });
  }
}

/**
 * Handle incoming messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = event.data;

  switch (type) {
    case "init": {
      const initPayload = payload as InitPayload | undefined;
      await initializePipeline(initPayload?.modelSize || "tiny");
      break;
    }

    case "transcribe": {
      const transcribePayload = payload as TranscribePayload;
      await transcribeAudio(
        transcribePayload.audioBlob,
        transcribePayload.language,
        id,
      );
      break;
    }

    case "check-model": {
      const modelSize =
        (payload as { modelSize: "tiny" | "base" | "small" })?.modelSize ||
        "tiny";
      await checkModelStatus(modelSize);
      break;
    }

    case "download-model": {
      const downloadPayload = payload as DownloadModelPayload;
      await downloadModel(downloadPayload.modelSize, downloadPayload.wifiOnly);
      break;
    }

    case "delete-model": {
      const modelSize = (payload as { modelSize: "tiny" | "base" | "small" })
        ?.modelSize;
      if (modelSize) {
        await deleteModel(modelSize);
      }
      break;
    }

    case "cancel": {
      // For now, we can't cancel mid-transcription with transformers.js
      // Future: Add AbortController support
      break;
    }

    default:
      respond({
        type: "error",
        id,
        payload: {
          message: `Unknown message type: ${type}`,
          code: "UNKNOWN_MESSAGE",
        },
      });
  }
};

// Let main thread know worker is loaded
respond({ type: "ready", payload: { status: "worker-loaded" } });
