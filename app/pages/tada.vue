<script setup lang="ts">
// Ta-Da! page - celebrate accomplishments with positive reinforcement
import type { Entry } from "~/server/db/schema";
import { getEntryDisplayProps } from "~/utils/categoryDefaults";

const { error: showError } = useToast();

definePageMeta({
  layout: "default",
});

const router = useRouter();

// Fetch Ta-Da! entries from API
const entries = ref<Entry[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

// Emoji picker state
const showEmojiPicker = ref(false);
const emojiPickerEntry = ref<Entry | null>(null);
const isUpdating = ref(false);

// Navigate to entry only if no text was selected
function handleEntryClick(entry: Entry, event: MouseEvent) {
  const selection = window.getSelection();
  if (selection && selection.toString().trim().length > 0) {
    return;
  }
  if ((event.target as HTMLElement).closest("a, button")) {
    return;
  }
  router.push(`/entry/${entry.id}`);
}

onMounted(async () => {
  try {
    // Fetch only Ta-Da! type entries
    const data = (await $fetch("/api/entries")) as Entry[];
    entries.value = data.filter((e) => e.type === "tada");
  } catch (err: unknown) {
    console.error("Failed to fetch Ta-Da! entries:", err);
    error.value = err instanceof Error ? err.message : "Failed to load entries";
  } finally {
    isLoading.value = false;
  }
});

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Get display properties for an entry
function getDisplayProps(entry: Entry) {
  return getEntryDisplayProps({
    emoji: entry.emoji,
    category: entry.category,
    subcategory: entry.subcategory,
  });
}

// Show emoji picker for an entry
function openEmojiPicker(entry: Entry, event: Event) {
  event.preventDefault();
  event.stopPropagation();
  emojiPickerEntry.value = entry;
  showEmojiPicker.value = true;
}

// Update entry emoji
async function updateEmoji(emoji: string) {
  if (!emojiPickerEntry.value) return;

  const entry = emojiPickerEntry.value;
  isUpdating.value = true;

  try {
    await $fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      body: { emoji },
    });

    // Update local state
    entry.emoji = emoji;
  } catch (err: unknown) {
    console.error("Failed to update emoji:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    showError(`Failed to update emoji: ${message}`);
  } finally {
    isUpdating.value = false;
    emojiPickerEntry.value = null;
  }
}
</script>

<template>
  <div>
    <!-- Page header with Ta-Da! logotype -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <img src="/icons/tada-logotype.png" alt="TA-DA" class="h-16 w-auto" />
        <div>
          <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
            Your Accomplishments
          </h1>
          <p class="text-sm text-stone-500 dark:text-stone-400">
            Celebrate what you've achieved
          </p>
        </div>
      </div>

      <!-- Add Ta-Da! button -->
      <NuxtLink
        to="/add?type=tada"
        class="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors shadow-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
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
        <span class="hidden sm:inline">New Ta-Da!</span>
        <span class="sm:hidden">⚡</span>
      </NuxtLink>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"
      />
    </div>

    <!-- Empty state with positive reinforcement -->
    <div v-else-if="entries.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">⚡</div>
      <h2 class="text-xl font-semibold text-stone-700 dark:text-stone-200 mb-2">
        Ready to celebrate?
      </h2>
      <p class="text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
        Every accomplishment deserves recognition. Big or small, personal or
        professional — capture your wins here and build a record of what you've
        achieved.
      </p>
      <NuxtLink
        to="/add?type=tada"
        class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors shadow-md"
      >
        ⚡ Add your first Ta-Da!
      </NuxtLink>
    </div>

    <!-- Entries list -->
    <div v-else class="space-y-4">
      <!-- Success counter -->
      <div
        class="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-amber-700 dark:text-amber-300 font-medium">
              Total Accomplishments
            </p>
            <p class="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {{ entries.length }}
            </p>
          </div>
          <div class="text-5xl">⚡</div>
        </div>
      </div>

      <!-- Ta-Da! entries -->
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="bg-white dark:bg-stone-800 rounded-xl p-4 shadow-sm border border-stone-200 dark:border-stone-700 hover:border-amber-300 dark:hover:border-amber-600 transition-all hover:shadow-md cursor-pointer"
        @click="handleEntryClick(entry, $event)"
      >
        <div class="flex items-start gap-3">
          <!-- Entry emoji with amber highlight (clickable) -->
          <button
            class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:scale-110 transition-transform cursor-pointer bg-amber-100 dark:bg-amber-900/30"
            :style="{
              color: getDisplayProps(entry).color,
            }"
            title="Change emoji"
            @click="openEmojiPicker(entry, $event)"
          >
            {{ getDisplayProps(entry).emoji }}
          </button>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3
                class="font-medium text-stone-800 dark:text-stone-100 truncate"
              >
                {{ entry.name }}
              </h3>
              <span
                class="text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap"
              >
                {{ formatDate(entry.timestamp) }}
              </span>
            </div>
            <p
              v-if="entry.notes"
              class="text-sm text-stone-600 dark:text-stone-300 line-clamp-2"
            >
              {{ entry.notes }}
            </p>

            <!-- Subcategory badge -->
            <div v-if="entry.subcategory" class="mt-2">
              <span
                class="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
              >
                {{ entry.subcategory }}
              </span>
            </div>
          </div>

          <!-- Arrow -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-stone-400 flex-shrink-0"
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
        </div>
      </div>
    </div>

    <!-- Emoji Picker Component -->
    <EmojiPicker
      v-model="showEmojiPicker"
      :entry-name="emojiPickerEntry?.name"
      @select="updateEmoji"
    />
  </div>
</template>
