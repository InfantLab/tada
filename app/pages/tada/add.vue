<script setup lang="ts">
// Dedicated Ta-Da! add page - celebrate accomplishments with positive reinforcement
import { getSubcategoriesForCategory } from "~/utils/categoryDefaults";

definePageMeta({
  layout: "default",
});

// Form state
const title = ref("");
const notes = ref("");
const isSubmitting = ref(false);

// Emoji picker state
const customEmoji = ref<string | null>(null);
const showEmojiPicker = ref(false);

// Subcategory for tadas (home, work, personal, etc.)
const tadaSubcategory = ref("personal");

// Get subcategory options for tadas
const tadaSubcategoryOptions = computed(() => {
  return getSubcategoriesForCategory("accomplishment").map((s) => ({
    value: s.slug,
    label: s.label,
    emoji: s.emoji,
  }));
});

// Function to open emoji picker
function openEmojiPicker() {
  showEmojiPicker.value = true;
}

// Function to handle emoji selection
function handleEmojiSelect(emoji: string) {
  customEmoji.value = emoji;
}

async function submitEntry() {
  if (!title.value.trim() && !notes.value.trim()) return;

  isSubmitting.value = true;

  try {
    const entry = {
      type: "tada",
      name: title.value.trim() || "Ta-Da! entry",
      category: "accomplishment",
      subcategory: tadaSubcategory.value,
      emoji: customEmoji.value || undefined,
      title: title.value.trim() || null,
      notes: notes.value.trim() || null,
      timestamp: new Date().toISOString(),
      data: {},
      tags: ["accomplishment", tadaSubcategory.value].filter(
        Boolean
      ) as string[],
    };

    await $fetch("/api/entries", {
      method: "POST",
      body: entry,
    });

    // Navigate back to tada page
    navigateTo("/tada");
  } catch (error: unknown) {
    console.error("Failed to create Ta-Da!:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    alert(`Failed to create Ta-Da!: ${message}`);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Page header with Ta-Da! branding -->
    <div class="flex items-center gap-4 mb-6">
      <NuxtLink
        to="/tada"
        class="p-2 -ml-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
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
      </NuxtLink>
      <img src="/icons/tada-logotype.png" alt="TA-DA" class="h-12 w-auto" />
    </div>

    <!-- Celebratory header -->
    <div
      class="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-6 mb-6 border border-amber-200 dark:border-amber-800"
    >
      <div class="flex items-center gap-3 mb-2">
        <span class="text-4xl">⚡</span>
        <h1 class="text-2xl font-bold text-amber-700 dark:text-amber-300">
          What did you accomplish?
        </h1>
      </div>
      <p class="text-sm text-amber-600 dark:text-amber-400">
        Every win deserves recognition. Celebrate what you did!
      </p>
    </div>

    <form class="space-y-6" @submit.prevent="submitEntry">
      <!-- Title -->
      <div>
        <label
          for="title"
          class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
        >
          What did you do?
        </label>
        <input
          id="title"
          v-model="title"
          type="text"
          placeholder="Describe your accomplishment..."
          class="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          autofocus
        />
      </div>

      <!-- Custom Emoji -->
      <div>
        <label
          class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
        >
          Emoji (optional)
        </label>
        <button
          type="button"
          class="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-750 transition-colors flex items-center gap-3"
          @click="openEmojiPicker"
        >
          <span class="text-2xl">{{ customEmoji || "⚡" }}</span>
          <span class="text-stone-500 dark:text-stone-400"
            >Click to change emoji</span
          >
        </button>
      </div>

      <!-- Subcategory for Tadas -->
      <div>
        <label
          class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
        >
          Category
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="subcat in tadaSubcategoryOptions"
            :key="subcat.value"
            type="button"
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
            :class="
              tadaSubcategory === subcat.value
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
            "
            @click="tadaSubcategory = subcat.value"
          >
            <span>{{ subcat.emoji }}</span>
            <span>{{ subcat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label
          for="notes"
          class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
        >
          Details (optional)
        </label>
        <textarea
          id="notes"
          v-model="notes"
          rows="4"
          placeholder="Add any details you want to remember..."
          class="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
        />
      </div>

      <!-- Submit button with celebration styling -->
      <button
        type="submit"
        :disabled="isSubmitting || (!title.trim() && !notes.trim())"
        class="w-full py-4 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-stone-300 disabled:to-stone-300 dark:disabled:from-stone-600 dark:disabled:to-stone-600 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
      >
        <span v-if="isSubmitting">Saving...</span>
        <template v-else>
          <span class="text-2xl">⚡</span>
          <span>Ta-Da!</span>
          <span class="text-2xl">🎉</span>
        </template>
      </button>
    </form>

    <!-- Emoji Picker Component -->
    <EmojiPicker
      v-model="showEmojiPicker"
      entry-name="this Ta-Da!"
      @select="handleEmojiSelect"
    />
  </div>
</template>
