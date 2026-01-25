<template>
  <div class="model-download-progress">
    <!-- Not Downloaded State -->
    <div v-if="!isDownloaded && !isDownloading" class="download-prompt">
      <div class="model-info">
        <div class="model-header">
          <span class="model-icon">🧠</span>
          <span class="model-name">{{ modelName }}</span>
        </div>
        <p class="model-description">
          {{ description }}
        </p>
        <div class="model-specs">
          <span class="spec-item">
            <span class="spec-icon">💾</span>
            {{ sizeDisplay }}
          </span>
          <span class="spec-item">
            <span class="spec-icon">⚡</span>
            {{ speedLabel }}
          </span>
        </div>
      </div>
      <button
        class="download-btn"
        :disabled="wifiOnly && !isOnWifi"
        @click="startDownload"
      >
        <span v-if="wifiOnly && !isOnWifi" class="wifi-warning">
          📶 WiFi required
        </span>
        <span v-else> Download Model </span>
      </button>
      <p v-if="wifiOnly && !isOnWifi" class="wifi-hint">
        Connect to WiFi to download, or disable WiFi-only in settings.
      </p>
    </div>

    <!-- Downloading State -->
    <div v-else-if="isDownloading" class="downloading">
      <div class="progress-header">
        <span class="model-icon">🧠</span>
        <span class="progress-label">Downloading {{ modelName }}...</span>
      </div>

      <div class="progress-container">
        <div
          class="progress-bar"
          :style="{ width: `${percentComplete}%` }"
          role="progressbar"
          :aria-valuenow="percentComplete"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span class="progress-text">{{ percentComplete }}%</span>
        </div>
      </div>

      <div class="progress-details">
        <span class="bytes-downloaded">
          {{ formatBytes(downloadedBytes) }} / {{ formatBytes(totalBytes) }}
        </span>
        <button class="cancel-btn" @click="cancelDownload">Cancel</button>
      </div>
    </div>

    <!-- Downloaded State -->
    <div v-else class="downloaded">
      <div class="model-header">
        <span class="model-icon">✅</span>
        <span class="model-name">{{ modelName }}</span>
        <span class="ready-badge">Ready</span>
      </div>
      <div class="model-specs">
        <span class="spec-item">
          <span class="spec-icon">💾</span>
          {{ sizeDisplay }}
        </span>
        <span class="spec-item">
          <span class="spec-icon">⚡</span>
          {{ speedLabel }}
        </span>
      </div>
      <button class="delete-btn" @click="deleteModel">Delete Model</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

type ModelSize = "tiny" | "base" | "small";

interface Props {
  modelSize: ModelSize;
  wifiOnly?: boolean;
}

const emit = defineEmits<{
  "download-start": [];
  "download-complete": [];
  "download-error": [error: string];
  "model-deleted": [];
}>();

const props = withDefaults(defineProps<Props>(), {
  wifiOnly: false,
});

// emit already defined above via defineEmits

// Model configurations
const MODEL_INFO = {
  tiny: {
    name: "Whisper Tiny",
    sizeInMB: 75,
    speed: "fastest",
    accuracy: "basic",
    description:
      "Fastest processing, suitable for short recordings with clear audio.",
  },
  base: {
    name: "Whisper Base",
    sizeInMB: 145,
    speed: "fast",
    accuracy: "good",
    description: "Good balance of speed and accuracy for most recordings.",
  },
  small: {
    name: "Whisper Small",
    sizeInMB: 490,
    speed: "moderate",
    accuracy: "best",
    description: "Best accuracy, recommended for longer or complex recordings.",
  },
} as const;

// State
const isDownloaded = ref(false);
const isDownloading = ref(false);
const percentComplete = ref(0);
const downloadedBytes = ref(0);
const totalBytes = ref(0);
const isOnWifi = ref(true);
const worker = ref<Worker | null>(null);

// Computed
const modelConfig = computed(() => MODEL_INFO[props.modelSize]);
const modelName = computed(() => modelConfig.value.name);
const description = computed(() => modelConfig.value.description);
const sizeDisplay = computed(() => `${modelConfig.value.sizeInMB} MB`);
const speedLabel = computed(() => {
  const speed = modelConfig.value.speed;
  return speed.charAt(0).toUpperCase() + speed.slice(1);
});

// Check network type for WiFi-only downloads
function checkNetworkType(): void {
   
  const connection =
    (navigator as any).connection ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).mozConnection ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).webkitConnection;

  if (connection) {
    // WiFi, ethernet, or unknown (assume WiFi for desktop)
    isOnWifi.value = connection.type !== "cellular";
  } else {
    // Can't detect, assume WiFi
    isOnWifi.value = true;
  }
}

// Format bytes for display
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Initialize worker and check model status
async function initWorker(): Promise<void> {
  try {
    worker.value = new Worker(
      new URL("~/workers/whisper.worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.value.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case "model-status":
          isDownloaded.value = payload.isDownloaded;
          break;

        case "download-progress":
          percentComplete.value = payload.percentComplete;
          downloadedBytes.value = payload.downloadedBytes;
          totalBytes.value = payload.totalBytes;
          break;

        case "download-complete":
          isDownloading.value = false;
          isDownloaded.value = true;
          emit("download-complete");
          break;

        case "error":
          isDownloading.value = false;
          emit("download-error", payload.message);
          break;

        case "ready":
          if (payload.status === "worker-loaded") {
            // Check if model is already downloaded
            worker.value?.postMessage({
              type: "check-model",
              payload: { modelSize: props.modelSize },
            });
          }
          break;
      }
    };

    worker.value.onerror = (error) => {
      emit("download-error", error.message);
    };
  } catch {
    // Worker not supported or error loading
    emit("download-error", "Web Worker not supported in this browser");
  }
}

// Start download
function startDownload(): void {
  if (!worker.value) return;

  isDownloading.value = true;
  percentComplete.value = 0;
  downloadedBytes.value = 0;
  totalBytes.value = modelConfig.value.sizeInMB * 1024 * 1024;

  emit("download-start");

  worker.value.postMessage({
    type: "download-model",
    payload: {
      modelSize: props.modelSize,
      wifiOnly: props.wifiOnly,
    },
  });
}

// Cancel download
function cancelDownload(): void {
  if (!worker.value) return;

  worker.value.postMessage({ type: "cancel" });
  isDownloading.value = false;
  percentComplete.value = 0;
}

// Delete model
function deleteModel(): void {
  if (!worker.value) return;

  worker.value.postMessage({
    type: "delete-model",
    payload: { modelSize: props.modelSize },
  });

  isDownloaded.value = false;
  emit("model-deleted");
}

// Lifecycle
onMounted(() => {
  checkNetworkType();
  initWorker();

  // Listen for network changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connection = (navigator as any).connection;
  if (connection) {
    connection.addEventListener("change", checkNetworkType);
  }
});

onUnmounted(() => {
  if (worker.value) {
    worker.value.terminate();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connection = (navigator as any).connection;
  if (connection) {
    connection.removeEventListener("change", checkNetworkType);
  }
});
</script>

<style scoped>
.model-download-progress {
  background: var(--color-surface, #1e1e2e);
  border: 1px solid var(--color-border, #313244);
  border-radius: 12px;
  padding: 1rem;
}

.download-prompt,
.downloading,
.downloaded {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.model-icon {
  font-size: 1.25rem;
}

.model-name {
  font-weight: 600;
  color: var(--color-text, #cdd6f4);
}

.ready-badge {
  background: var(--color-success, #a6e3a1);
  color: var(--color-success-text, #1e1e2e);
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-weight: 500;
}

.model-description {
  font-size: 0.875rem;
  color: var(--color-text-muted, #a6adc8);
  margin: 0;
  line-height: 1.4;
}

.model-specs {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.spec-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--color-text-muted, #a6adc8);
}

.spec-icon {
  font-size: 0.875rem;
}

.download-btn {
  background: var(--color-primary, #89b4fa);
  color: var(--color-primary-text, #1e1e2e);
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.download-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.download-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wifi-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wifi-hint {
  font-size: 0.75rem;
  color: var(--color-warning, #f9e2af);
  margin: 0;
}

/* Progress bar */
.progress-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-label {
  color: var(--color-text, #cdd6f4);
  font-weight: 500;
}

.progress-container {
  background: var(--color-surface-alt, #313244);
  border-radius: 999px;
  height: 24px;
  overflow: hidden;
  position: relative;
}

.progress-bar {
  background: linear-gradient(
    90deg,
    var(--color-primary, #89b4fa),
    var(--color-secondary, #cba6f7)
  );
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  min-width: 40px;
}

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary-text, #1e1e2e);
}

.progress-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bytes-downloaded {
  font-size: 0.875rem;
  color: var(--color-text-muted, #a6adc8);
}

.cancel-btn,
.delete-btn {
  background: transparent;
  color: var(--color-error, #f38ba8);
  border: 1px solid var(--color-error, #f38ba8);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}

.cancel-btn:hover,
.delete-btn:hover {
  background: var(--color-error, #f38ba8);
  color: var(--color-error-text, #1e1e2e);
}
</style>
