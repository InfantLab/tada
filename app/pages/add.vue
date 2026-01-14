<script setup lang="ts">
// Add entry page - quick capture for any entry type

const { error: showError } = useToast();

// Load user preferences for entry types
const { loadPreferences, isEntryTypeVisible, getVisibleEntryTypes } =
  usePreferences();

// Load preferences on mount
onMounted(() => {
  loadPreferences();
});

definePageMeta({
  layout: "default",
});

const route = useRoute();

// Form state
const entryType = ref((route.query["type"] as string) || "tada");
const title = ref("");
const notes = ref("");
const isSubmitting = ref(false);

// Built-in entry types
const builtInEntryTypes = [
  {
    value: "tada",
    label: "Ta-Da!",
    emoji: "⚡",
    description: "Celebrate an accomplishment",
  },
  {
    value: "dream",
    label: "Dream",
    emoji: "🌙",
    description: "Record a dream",
  },
  {
    value: "note",
    label: "Note",
    emoji: "📝",
    description: "Capture a thought",
  },
  {
    value: "journal",
    label: "Journal",
    emoji: "💭",
    description: "Write a journal entry",
  },
];

// Visible entry types (filtered by preferences + custom types)
const entryTypes = computed(() => {
  const builtInVisible = builtInEntryTypes
    .filter((t) => isEntryTypeVisible(t.value))
    .map((t) => ({
      value: t.value,
      label: t.label,
      emoji: t.emoji,
      description: t.description,
      name: t.label,
    }));

  // Get custom entry types from preferences
  const customTypes = getVisibleEntryTypes([]).map((t) => ({
    value: t.name.toLowerCase().replace(/\s+/g, "-"),
    label: t.name,
    emoji: t.emoji,
    description: "Custom entry type",
    name: t.name,
  }));

  return [...builtInVisible, ...customTypes];
});

// Dream-specific fields
const dreamData = ref({
  lucid: false,
  vivid: 3,
  emotions: [] as string[],
});

const emotionOptions = [
  "joy",
  "fear",
  "wonder",
  "anxiety",
  "peace",
  "confusion",
  "love",
  "anger",
  "sadness",
];

async function submitEntry() {
  if (!title.value.trim() && !notes.value.trim()) return;

  isSubmitting.value = true;

  try {
    const entry = {
      type: entryType.value,
      name: title.value.trim() || `${entryType.value} entry`,
      title: title.value.trim() || null,
      notes: notes.value.trim() || null,
      timestamp: new Date().toISOString(),
      data: entryType.value === "dream" ? dreamData.value : {},
      tags: entryType.value === "dream" ? ["dream"] : [],
    };

    await $fetch("/api/entries", {
      method: "POST",
      body: entry,
    });

    // Navigate back to timeline
    navigateTo("/");
  } catch (error: unknown) {
    console.error("Failed to create entry:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    showError(`Failed to create entry: ${message}`);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Page header -->
    <div class="flex items-center gap-4 mb-6">
      <NuxtLink
        to="/"
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
      <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
        New Entry
      </h1>
    </div>

    <form class="space-y-6" @submit.prevent="submitEntry">
      <!-- Entry type selector -->
      <div>
        <label
          class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
        >
          Type
        </label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="type in entryTypes"
            :key="type.value"
            type="button"
            class="p-3 rounded-xl border-2 text-left transition-colors"
            :class="
              entryType === type.value
                ? 'border-gold-light bg-gold-highlight/20 dark:border-gold-dark dark:bg-gold-dark/10'
                : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
            "
            @click="entryType = type.value"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xl">{{ type.emoji }}</span>
              <span class="font-medium text-stone-800 dark:text-stone-100">{{
                type.label
              }}</span>
            </div>
            <p class="text-xs text-stone-500 dark:text-stone-400">
              {{ type.description }}
            </p>
          </button>
        </div>
      </div>

      <!-- Title -->
      <div>
        <label
          for="title"
          class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
        >
          Title
        </label>
        <input
          id="title"
          v-model="title"
          type="text"
          :placeholder="
            entryType === 'tada'
              ? 'What did you accomplish?'
              : entryType === 'dream'
              ? 'What was the dream about?'
              : 'Give it a title...'
          "
          class="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-gold-light dark:focus:ring-gold-dark focus:border-transparent"
        />
      </div>

      <!-- Notes -->
      <div>
        <label
          for="notes"
          class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
        >
          Notes
        </label>
        <textarea
          id="notes"
          v-model="notes"
          rows="4"
          :placeholder="
            entryType === 'dream'
              ? 'Describe the dream in detail...'
              : 'Add more details...'
          "
          class="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-gold-light dark:focus:ring-gold-dark focus:border-transparent resize-none"
        />
      </div>

      <!-- Dream-specific fields -->
      <template v-if="entryType === 'dream'">
        <!-- Lucid toggle -->
        <div class="flex items-center justify-between">
          <label
            for="lucid"
            class="text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Lucid dream?
          </label>
          <button
            type="button"
            class="relative w-12 h-7 rounded-full transition-colors"
            :class="
              dreamData.lucid
                ? 'bg-gold-light dark:bg-gold-dark'
                : 'bg-stone-300 dark:bg-stone-600'
            "
            role="switch"
            :aria-checked="dreamData.lucid"
            aria-label="Toggle lucid dream"
            @click="dreamData.lucid = !dreamData.lucid"
          >
            <span
              class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform"
              :class="dreamData.lucid ? 'translate-x-5' : ''"
            />
          </button>
        </div>

        <!-- Vividness slider -->
        <div>
          <label
            class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
          >
            Vividness: {{ dreamData.vivid }}/5
          </label>
          <input
            v-model.number="dreamData.vivid"
            type="range"
            min="1"
            max="5"
            class="w-full accent-gold-light dark:accent-gold-dark"
          />
        </div>

        <!-- Emotions -->
        <div>
          <label
            class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
          >
            Emotions
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="emotion in emotionOptions"
              :key="emotion"
              type="button"
              class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              :class="
                dreamData.emotions.includes(emotion)
                  ? 'bg-gold-light text-black dark:bg-gold-dark dark:text-white'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              "
              @click="
                dreamData.emotions.includes(emotion)
                  ? (dreamData.emotions = dreamData.emotions.filter(
                      (e) => e !== emotion
                    ))
                  : dreamData.emotions.push(emotion)
              "
            >
              {{ emotion }}
            </button>
          </div>
        </div>
      </template>

      <!-- Submit button -->
      <button
        type="submit"
        :disabled="isSubmitting || (!title.trim() && !notes.trim())"
        class="w-full py-3 px-4 bg-gold-light hover:opacity-90 text-black dark:bg-gold-dark dark:text-white dark:hover:opacity-90 disabled:bg-stone-300 dark:disabled:bg-stone-600 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <span v-if="isSubmitting">Saving...</span>
        <span v-else>{{
          entryType === "tada" ? "⚡ Ta-Da!" : "Save Entry"
        }}</span>
      </button>
    </form>
  </div>
</template>
