<script setup lang="ts">
/**
 * Error Tracker Panel Component
 * Shows errors/warnings with clear distinction, copy, and clear functionality
 * Only shows in development mode
 */

const {
  errors,
  isExpanded,
  clearErrors,
  clearByType,
  copyAllErrors,
  copyError,
  removeError,
  errorCount,
  warningCount,
  infoCount,
  totalCount,
} = useErrorTracker();

const copied = ref(false);
const filter = ref<"all" | "error" | "warning" | "info">("all");

const filteredErrors = computed(() => {
  if (filter.value === "all") return errors.value;
  return errors.value.filter((e) => e.type === filter.value);
});

async function handleCopyAll() {
  const success = await copyAllErrors();
  if (success) {
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  }
}

async function handleCopyOne(id: string) {
  await copyError(id);
}

function getIcon(type: "error" | "warning" | "info") {
  switch (type) {
    case "error":
      return "❌";
    case "warning":
      return "⚠️";
    case "info":
      return "ℹ️";
  }
}

function getColor(type: "error" | "warning" | "info") {
  switch (type) {
    case "error":
      return "text-red-500";
    case "warning":
      return "text-yellow-500";
    case "info":
      return "text-blue-500";
  }
}

function getBgColor(type: "error" | "warning" | "info") {
  switch (type) {
    case "error":
      return "bg-red-500/10 border-red-500/30";
    case "warning":
      return "bg-yellow-500/10 border-yellow-500/30";
    case "info":
      return "bg-blue-500/10 border-blue-500/30";
  }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Only show in dev mode
const showPanel = computed(() => {
  return import.meta.dev && totalCount.value > 0;
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="showPanel"
      class="fixed bottom-4 left-4 z-[9999] font-mono text-sm"
    >
      <!-- Collapsed State: Badge -->
      <button
        v-if="!isExpanded"
        class="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm transition-all hover:scale-105"
        :class="
          errorCount > 0
            ? 'bg-red-500/90 text-white'
            : warningCount > 0
            ? 'bg-yellow-500/90 text-black'
            : 'bg-blue-500/90 text-white'
        "
        @click="isExpanded = true"
      >
        <span v-if="errorCount > 0">❌ {{ errorCount }}</span>
        <span v-if="warningCount > 0">⚠️ {{ warningCount }}</span>
        <span v-if="infoCount > 0">ℹ️ {{ infoCount }}</span>
      </button>

      <!-- Expanded State: Full Panel -->
      <div
        v-else
        class="w-[400px] max-h-[60vh] bg-gray-900/95 text-white rounded-lg shadow-2xl overflow-hidden flex flex-col backdrop-blur-sm"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-700"
        >
          <div class="flex items-center gap-3">
            <span class="font-semibold">Errors</span>
            <div class="flex items-center gap-2 text-xs">
              <span v-if="errorCount > 0" class="text-red-400">
                ❌ {{ errorCount }}
              </span>
              <span v-if="warningCount > 0" class="text-yellow-400">
                ⚠️ {{ warningCount }}
              </span>
              <span v-if="infoCount > 0" class="text-blue-400">
                ℹ️ {{ infoCount }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <!-- Copy All -->
            <button
              class="p-1.5 rounded hover:bg-gray-700 transition-colors"
              :title="copied ? 'Copied!' : 'Copy All'"
              @click="handleCopyAll"
            >
              {{ copied ? "✓" : "📋" }}
            </button>
            <!-- Clear All -->
            <button
              class="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title="Clear All"
              @click="clearErrors"
            >
              🗑️
            </button>
            <!-- Collapse -->
            <button
              class="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title="Collapse"
              @click="isExpanded = false"
            >
              ▼
            </button>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="flex border-b border-gray-700 text-xs">
          <button
            v-for="f in ['all', 'error', 'warning', 'info'] as const"
            :key="f"
            class="flex-1 px-3 py-2 transition-colors"
            :class="
              filter === f
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            "
            @click="filter = f"
          >
            {{
              f === "all"
                ? `All (${totalCount})`
                : f === "error"
                ? `Errors (${errorCount})`
                : f === "warning"
                ? `Warnings (${warningCount})`
                : `Info (${infoCount})`
            }}
          </button>
        </div>

        <!-- Error List -->
        <div class="flex-1 overflow-y-auto">
          <div
            v-for="error in filteredErrors"
            :key="error.id"
            class="border-b border-gray-800 last:border-0"
          >
            <div
              class="px-4 py-3 hover:bg-gray-800/50 transition-colors"
              :class="getBgColor(error.type)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span :class="getColor(error.type)">
                      {{ getIcon(error.type) }}
                    </span>
                    <span class="text-xs text-gray-400">
                      {{ formatTime(error.timestamp) }}
                    </span>
                    <span
                      v-if="error.source"
                      class="text-xs text-gray-500 truncate"
                    >
                      {{ error.source }}
                    </span>
                  </div>
                  <p class="text-gray-200 break-words">{{ error.message }}</p>
                  <p
                    v-if="error.details"
                    class="text-xs text-gray-400 mt-1 break-words"
                  >
                    {{ error.details }}
                  </p>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <button
                    class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                    title="Copy"
                    @click="handleCopyOne(error.id)"
                  >
                    📋
                  </button>
                  <button
                    class="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                    title="Dismiss"
                    @click="removeError(error.id)"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="filteredErrors.length === 0"
            class="px-4 py-8 text-center text-gray-500"
          >
            No {{ filter === "all" ? "errors" : filter + "s" }} to display
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
