<script setup lang="ts">
import {
  type LinkMetadata,
  getProviderIcon,
  getProviderName,
  isValidUrl,
} from "~/utils/linkPreview";

const props = defineProps<{
  url: string;
  /** Pre-fetched metadata (if available from entry data) */
  metadata?: LinkMetadata;
  /** Show compact version (no description) */
  compact?: boolean;
}>();

const emit = defineEmits<{
  /** Emitted when metadata is successfully fetched */
  "metadata-loaded": [metadata: LinkMetadata];
}>();

// Use provided metadata or fetch it
const localMetadata = ref<LinkMetadata | null>(props.metadata || null);
const isLoading = ref(false);
const hasError = ref(false);

// Fetch metadata if not provided
async function fetchMetadata() {
  if (!props.url || !isValidUrl(props.url)) return;
  if (localMetadata.value) return; // Already have metadata

  isLoading.value = true;
  hasError.value = false;

  try {
    const data = await $fetch<LinkMetadata>("/api/link-preview", {
      query: { url: props.url },
    });
    localMetadata.value = data;
    emit("metadata-loaded", data);
  } catch (error) {
    console.error("Failed to fetch link metadata:", error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
}

// Watch for URL changes
watch(
  () => props.url,
  () => {
    localMetadata.value = props.metadata || null;
    hasError.value = false;
    fetchMetadata();
  },
  { immediate: true },
);

// Watch for external metadata updates
watch(
  () => props.metadata,
  (newMeta) => {
    if (newMeta) {
      localMetadata.value = newMeta;
    }
  },
);

// Computed display values
const displayTitle = computed(() => {
  if (localMetadata.value?.title) return localMetadata.value.title;
  // Extract domain as fallback
  try {
    return new URL(props.url).hostname.replace(/^www\./, "");
  } catch {
    return props.url;
  }
});

const providerIcon = computed(() => {
  return getProviderIcon(localMetadata.value?.type || "generic");
});

const providerName = computed(() => {
  return (
    localMetadata.value?.providerName ||
    getProviderName(localMetadata.value?.type || "generic")
  );
});
</script>

<template>
  <div
    class="group relative rounded-lg border overflow-hidden transition-all hover:shadow-md"
    :class="[
      hasError
        ? 'border-stone-200 dark:border-stone-700'
        : 'border-stone-200 dark:border-stone-700 hover:border-indigo-300 dark:hover:border-indigo-600',
    ]"
  >
    <a
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-stretch"
    >
      <!-- Thumbnail -->
      <div
        v-if="localMetadata?.thumbnailUrl"
        class="flex-shrink-0 w-24 sm:w-32 bg-stone-100 dark:bg-stone-800"
      >
        <img
          :src="localMetadata.thumbnailUrl"
          :alt="displayTitle"
          class="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 p-3 min-w-0">
        <!-- Loading state -->
        <div v-if="isLoading" class="flex items-center gap-2">
          <div
            class="animate-pulse h-4 w-3/4 bg-stone-200 dark:bg-stone-700 rounded"
          />
        </div>

        <!-- Content -->
        <template v-else>
          <!-- Provider badge -->
          <div
            class="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mb-1"
          >
            <span>{{ providerIcon }}</span>
            <span>{{ providerName }}</span>
          </div>

          <!-- Title -->
          <h4
            class="font-medium text-sm text-stone-800 dark:text-stone-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
          >
            {{ displayTitle }}
          </h4>

          <!-- Description (if not compact) -->
          <p
            v-if="!compact && localMetadata?.description"
            class="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2"
          >
            {{ localMetadata.description }}
          </p>

          <!-- Author -->
          <p
            v-if="localMetadata?.authorName"
            class="text-xs text-stone-400 dark:text-stone-500 mt-1"
          >
            by {{ localMetadata.authorName }}
          </p>
        </template>
      </div>

      <!-- External link indicator -->
      <div
        class="flex-shrink-0 flex items-center pr-3 text-stone-400 dark:text-stone-500 group-hover:text-indigo-500 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </a>
  </div>
</template>
