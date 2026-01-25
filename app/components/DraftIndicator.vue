<script setup lang="ts">
/**
 * DraftIndicator - Shows count of unsaved draft entries
 *
 * Features:
 * - Badge showing number of pending drafts
 * - Click to open drafts list
 * - Polling or reactive updates
 *
 * Used in navigation/header to alert user of pending drafts
 */

interface Draft {
  id: string;
  input: Record<string, unknown>;
  parsedFrom: string | null;
  confidence: number | null;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
}

const emit = defineEmits<{
  (e: "click"): void;
  (e: "draft-selected", draft: Draft): void;
}>();

// Fetch drafts
const { data: draftsData, refresh, status } = useFetch<{ drafts: Draft[]; total: number }>("/api/entries/drafts", {
  default: () => ({ drafts: [], total: 0 }),
});

// Computed draft count
const draftCount = computed(() => draftsData.value?.total ?? 0);
const hasDrafts = computed(() => draftCount.value > 0);

// Show dropdown state
const showDropdown = ref(false);

// Refresh on mount and periodically
onMounted(() => {
  refresh();
  // Refresh every 60 seconds to check for expired drafts
  const interval = setInterval(refresh, 60000);
  onUnmounted(() => clearInterval(interval));
});

// Handle click on indicator
function handleClick() {
  if (hasDrafts.value) {
    showDropdown.value = !showDropdown.value;
  }
  emit("click");
}

// Handle selecting a draft
function selectDraft(draft: Draft) {
  showDropdown.value = false;
  emit("draft-selected", draft);
}

// Format relative time
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return `${Math.floor(diffHours / 24)}d ago`;
}

// Get draft name from input
function getDraftName(input: Record<string, unknown>): string {
  return (input["name"] as string) || (input["parsedFrom"] as string)?.slice(0, 30) || "Untitled draft";
}

// Close dropdown on outside click
function handleOutsideClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest(".draft-indicator")) {
    showDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleOutsideClick);
  onUnmounted(() => document.removeEventListener("click", handleOutsideClick));
});
</script>

<template>
  <div class="draft-indicator relative">
    <!-- Indicator button -->
    <button
      v-if="hasDrafts || status === 'pending'"
      type="button"
      class="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
      :class="hasDrafts
        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
        : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'"
      @click.stop="handleClick"
    >
      <!-- Draft icon -->
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
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
      
      <!-- Count badge -->
      <span v-if="hasDrafts">
        {{ draftCount }} draft{{ draftCount !== 1 ? "s" : "" }}
      </span>
      <span v-else-if="status === 'pending'" class="text-xs">
        Loading...
      </span>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showDropdown && hasDrafts"
        class="absolute right-0 mt-2 w-72 bg-white dark:bg-stone-800 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 z-50 overflow-hidden"
      >
        <!-- Header -->
        <div class="px-3 py-2 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50">
          <h3 class="text-sm font-medium text-stone-900 dark:text-white">
            Unsaved Drafts
          </h3>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            These entries need your attention
          </p>
        </div>

        <!-- Draft list -->
        <div class="max-h-64 overflow-y-auto">
          <button
            v-for="draft in draftsData?.drafts"
            :key="draft.id"
            type="button"
            class="w-full px-3 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors border-b border-stone-100 dark:border-stone-700 last:border-0"
            @click="selectDraft(draft)"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-stone-900 dark:text-white truncate">
                {{ getDraftName(draft.input) }}
              </span>
              <span
                v-if="draft.confidence !== null"
                class="text-xs px-1.5 py-0.5 rounded"
                :class="draft.confidence >= 0.8
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : draft.confidence >= 0.5
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'"
              >
                {{ Math.round(draft.confidence * 100) }}%
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-stone-500 dark:text-stone-400">
                {{ formatRelativeTime(draft.createdAt) }}
              </span>
              <span
                v-if="draft.parsedFrom"
                class="text-xs text-stone-400 dark:text-stone-500 truncate"
              >
                "{{ draft.parsedFrom.slice(0, 30) }}{{ draft.parsedFrom.length > 30 ? "..." : "" }}"
              </span>
            </div>
          </button>
        </div>

        <!-- Footer -->
        <div class="px-3 py-2 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50">
          <p class="text-xs text-stone-500 dark:text-stone-400 text-center">
            Drafts expire after 24 hours
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>
