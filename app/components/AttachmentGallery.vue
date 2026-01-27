<script setup lang="ts">
/**
 * AttachmentGallery - Display media attachments for an entry
 *
 * Shows a responsive grid of thumbnails with lightbox for full view.
 * Supports images, videos, and audio with appropriate previews.
 * Currently a UI mockup - actual media loading comes in v0.4.0+
 */

import type { Attachment } from "~/server/db/schema";

const props = defineProps<{
  /** Entry ID to fetch attachments for */
  entryId?: string;
  /** Pre-loaded attachments (alternative to fetching) */
  attachments?: Attachment[];
  /** Show in compact mode (smaller thumbnails) */
  compact?: boolean;
  /** Allow adding new attachments (edit mode) */
  editable?: boolean;
}>();

const emit = defineEmits<{
  /** Emitted when user wants to add attachment */
  add: [];
  /** Emitted when attachment is removed */
  remove: [attachmentId: string];
}>();

// Lightbox state
const lightboxOpen = ref(false);
const lightboxIndex = ref(0);

// Mock data for UI development (will be replaced with real API calls)
// Prefixed with _ to indicate intentionally unused for now
const _mockAttachments: Attachment[] = [
  {
    id: "mock-1",
    userId: "user-1",
    entryId: props.entryId || "entry-1",
    filename: "meditation-spot.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024000,
    storageKey: "/mock/meditation-spot.jpg",
    thumbnailKey: "/mock/meditation-spot-thumb.jpg",
    width: 1920,
    height: 1080,
    durationSeconds: null,
    status: "ready",
    errorMessage: null,
    createdAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    deletedAt: null,
  },
  {
    id: "mock-2",
    userId: "user-1",
    entryId: props.entryId || "entry-1",
    filename: "morning-sky.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 2048000,
    storageKey: "/mock/morning-sky.jpg",
    thumbnailKey: "/mock/morning-sky-thumb.jpg",
    width: 1600,
    height: 1200,
    durationSeconds: null,
    status: "ready",
    errorMessage: null,
    createdAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    deletedAt: null,
  },
];

// Use provided attachments or mock data for development
const displayAttachments = computed(() => {
  if (props.attachments && props.attachments.length > 0) {
    return props.attachments;
  }
  // Return empty for now - mock data only shown in dev/demo mode
  return [];
});

// Helpers
function isImage(attachment: Attachment): boolean {
  return attachment.mimeType.startsWith("image/");
}

function isVideo(attachment: Attachment): boolean {
  return attachment.mimeType.startsWith("video/");
}

function isAudio(attachment: Attachment): boolean {
  return attachment.mimeType.startsWith("audio/");
}

function _getMediaIcon(attachment: Attachment): string {
  if (isImage(attachment)) return "📷";
  if (isVideo(attachment)) return "🎬";
  if (isAudio(attachment)) return "🎵";
  return "📎";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Current attachment in lightbox
const currentAttachment = computed(() => {
  return displayAttachments.value[lightboxIndex.value] || null;
});

function openLightbox(index: number) {
  lightboxIndex.value = index;
  lightboxOpen.value = true;
}

function closeLightbox() {
  lightboxOpen.value = false;
}

function nextImage() {
  if (lightboxIndex.value < displayAttachments.value.length - 1) {
    lightboxIndex.value++;
  }
}

function prevImage() {
  if (lightboxIndex.value > 0) {
    lightboxIndex.value--;
  }
}

// Keyboard navigation for lightbox
function handleKeydown(e: KeyboardEvent) {
  if (!lightboxOpen.value) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") nextImage();
  if (e.key === "ArrowLeft") prevImage();
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="attachment-gallery">
    <!-- Empty state -->
    <div
      v-if="displayAttachments.length === 0 && !editable"
      class="text-center py-4 text-stone-400 dark:text-stone-500 text-sm"
    >
      No attachments
    </div>

    <!-- Gallery grid -->
    <div
      v-else
      class="grid gap-2"
      :class="compact ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'"
    >
      <!-- Attachment thumbnails -->
      <button
        v-for="(attachment, index) in displayAttachments"
        :key="attachment.id"
        class="relative aspect-square rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 group focus:outline-none focus:ring-2 focus:ring-tada-500"
        @click="openLightbox(index)"
      >
        <!-- Image thumbnail -->
        <div
          v-if="isImage(attachment)"
          class="w-full h-full bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-700 dark:to-stone-800 flex items-center justify-center"
        >
          <!-- Placeholder for actual image -->
          <span class="text-3xl opacity-50">📷</span>
        </div>

        <!-- Video thumbnail -->
        <div
          v-else-if="isVideo(attachment)"
          class="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center"
        >
          <span class="text-3xl">▶️</span>
        </div>

        <!-- Audio thumbnail -->
        <div
          v-else-if="isAudio(attachment)"
          class="w-full h-full bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 flex items-center justify-center"
        >
          <span class="text-3xl">🎵</span>
        </div>

        <!-- Hover overlay -->
        <div
          class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"
        >
          <svg
            class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
            />
          </svg>
        </div>

        <!-- Remove button (edit mode) -->
        <button
          v-if="editable"
          class="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold"
          title="Remove"
          @click.stop="emit('remove', attachment.id)"
        >
          ✕
        </button>

        <!-- Processing indicator -->
        <div
          v-if="attachment.status === 'processing'"
          class="absolute inset-0 bg-black/50 flex items-center justify-center"
        >
          <div
            class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"
          />
        </div>

        <!-- Error indicator -->
        <div
          v-if="attachment.status === 'failed'"
          class="absolute inset-0 bg-red-500/20 flex items-center justify-center"
        >
          <span class="text-2xl">⚠️</span>
        </div>
      </button>

      <!-- Add button (edit mode) -->
      <button
        v-if="editable"
        class="aspect-square rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-600 flex flex-col items-center justify-center gap-1 text-stone-400 dark:text-stone-500 hover:border-tada-400 hover:text-tada-500 transition-colors"
        @click="emit('add')"
      >
        <svg
          class="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span class="text-xs">Add</span>
      </button>
    </div>

    <!-- Lightbox modal -->
    <Teleport to="body">
      <div
        v-if="lightboxOpen && displayAttachments.length > 0"
        class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        @click.self="closeLightbox"
      >
        <!-- Close button -->
        <button
          class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          @click="closeLightbox"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <!-- Previous button -->
        <button
          v-if="lightboxIndex > 0"
          class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          @click="prevImage"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <!-- Next button -->
        <button
          v-if="lightboxIndex < displayAttachments.length - 1"
          class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          @click="nextImage"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        <!-- Image display -->
        <div class="max-w-4xl max-h-[80vh] p-4">
          <div
            v-if="currentAttachment"
            class="bg-stone-800 rounded-lg overflow-hidden"
          >
            <!-- Image placeholder -->
            <div
              v-if="isImage(currentAttachment)"
              class="w-full aspect-video bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center"
            >
              <div class="text-center text-white/60">
                <span class="text-6xl block mb-4">📷</span>
                <p class="text-sm">{{ currentAttachment.filename }}</p>
                <p class="text-xs mt-1 text-white/40">
                  {{ currentAttachment.width }} ×
                  {{ currentAttachment.height }}
                </p>
              </div>
            </div>

            <!-- Video placeholder -->
            <div
              v-else-if="isVideo(currentAttachment)"
              class="w-full aspect-video bg-gradient-to-br from-indigo-900/50 to-purple-900/50 flex items-center justify-center"
            >
              <div class="text-center text-white/60">
                <span class="text-6xl block mb-4">🎬</span>
                <p class="text-sm">{{ currentAttachment.filename }}</p>
                <p
                  v-if="currentAttachment.durationSeconds"
                  class="text-xs mt-1 text-white/40"
                >
                  {{ Math.floor(currentAttachment.durationSeconds / 60) }}:{{
                    String(currentAttachment.durationSeconds % 60).padStart(
                      2,
                      "0",
                    )
                  }}
                </p>
              </div>
            </div>

            <!-- Audio placeholder -->
            <div
              v-else-if="isAudio(currentAttachment)"
              class="w-full py-12 bg-gradient-to-br from-green-900/50 to-teal-900/50 flex items-center justify-center"
            >
              <div class="text-center text-white/60">
                <span class="text-6xl block mb-4">🎵</span>
                <p class="text-sm">{{ currentAttachment.filename }}</p>
                <p
                  v-if="currentAttachment.durationSeconds"
                  class="text-xs mt-1 text-white/40"
                >
                  {{ Math.floor(currentAttachment.durationSeconds / 60) }}:{{
                    String(currentAttachment.durationSeconds % 60).padStart(
                      2,
                      "0",
                    )
                  }}
                </p>
              </div>
            </div>
          </div>

          <!-- File info -->
          <div class="mt-4 text-center text-white/60 text-sm">
            <p>{{ formatFileSize(currentAttachment?.sizeBytes || 0) }}</p>
            <p class="text-xs mt-1 text-white/40">
              {{ lightboxIndex + 1 }} of {{ displayAttachments.length }}
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
