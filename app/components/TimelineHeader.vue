<script setup lang="ts">
// TimelineHeader - Search and filter controls for the timeline
interface Props {
  modelValue?: string;
  category?: string;
  timeRange?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  category: "",
  timeRange: "all",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:category": [value: string];
  "update:timeRange": [value: string];
}>();

const searchQuery = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const selectedCategory = computed({
  get: () => props.category,
  set: (value) => emit("update:category", value),
});

const selectedTimeRange = computed({
  get: () => props.timeRange,
  set: (value) => emit("update:timeRange", value),
});

const isSearchExpanded = ref(false);

// Common categories from ontology
const categories = [
  { value: "", label: "All", emoji: "📋" },
  { value: "mindfulness", label: "Mindfulness", emoji: "🧘" },
  { value: "accomplishment", label: "Accomplishment", emoji: "⚡" },
  { value: "movement", label: "Movement", emoji: "💪" },
  { value: "creative", label: "Creative", emoji: "🎨" },
  { value: "dreams", label: "Dreams", emoji: "🌙" },
  { value: "journal", label: "Journal", emoji: "📝" },
];

const timeRanges = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

function toggleSearch() {
  isSearchExpanded.value = !isSearchExpanded.value;
  if (!isSearchExpanded.value) {
    searchQuery.value = "";
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Search row -->
    <div class="flex items-center gap-2">
      <div
        class="relative flex-1 transition-all duration-200"
        :class="isSearchExpanded ? 'max-w-md' : 'max-w-10'"
      >
        <button
          v-if="!isSearchExpanded"
          type="button"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          aria-label="Search entries"
          @click="toggleSearch"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-stone-500 dark:text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>

        <div v-else class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search entries..."
            class="w-full pl-10 pr-10 py-2 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-tada-500 text-stone-800 dark:text-stone-100 placeholder-stone-500"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            aria-label="Close search"
            @click="toggleSearch"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Category chips -->
      <div class="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <button
          v-for="cat in categories"
          :key="cat.value"
          type="button"
          class="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors"
          :class="
            selectedCategory === cat.value
              ? 'bg-tada-500 text-white'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
          "
          @click="selectedCategory = cat.value"
        >
          <span>{{ cat.emoji }}</span>
          <span class="hidden sm:inline">{{ cat.label }}</span>
        </button>
      </div>
    </div>

    <!-- Time range row -->
    <div class="flex items-center gap-2">
      <select
        v-model="selectedTimeRange"
        class="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-tada-500"
      >
        <option
          v-for="range in timeRanges"
          :key="range.value"
          :value="range.value"
        >
          {{ range.label }}
        </option>
      </select>

      <span
        v-if="searchQuery"
        class="text-sm text-stone-500 dark:text-stone-400"
      >
        Searching: "{{ searchQuery }}"
      </span>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
