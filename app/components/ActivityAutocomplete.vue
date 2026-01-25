<script setup lang="ts">
/**
 * ActivityAutocomplete - Autocomplete input for activity names
 *
 * Features:
 * - Fetches suggestions from user's entry history
 * - Dropdown with activity names and categories
 * - Keyboard navigation support
 * - Debounced API calls
 *
 * Used in QuickEntryModal for activity name input
 */

interface ActivitySuggestion {
  name: string;
  category?: string;
  count: number;
  lastUsed: string;
}

const props = withDefaults(
  defineProps<{
    /** Current input value */
    modelValue: string;
    /** Placeholder text */
    placeholder?: string;
    /** Disable all interactions */
    disabled?: boolean;
    /** Label text */
    label?: string;
    /** Filter by entry type */
    entryType?: string;
  }>(),
  {
    placeholder: "What did you do?",
    disabled: false,
    label: undefined,
    entryType: undefined,
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "select", suggestion: ActivitySuggestion): void;
}>();

// State
const inputRef = ref<HTMLInputElement | null>(null);
const isOpen = ref(false);
const suggestions = ref<ActivitySuggestion[]>([]);
const selectedIndex = ref(-1);
const isLoading = ref(false);

// Debounced search
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

// Fetch suggestions from API
async function fetchSuggestions(query: string) {
  if (!query.trim()) {
    suggestions.value = [];
    return;
  }

  isLoading.value = true;
  try {
    const params = new URLSearchParams({ query });
    if (props.entryType) {
      params.set("type", props.entryType);
    }

    const response = await $fetch<{ suggestions: ActivitySuggestion[] }>(
      `/api/entries/suggestions?${params.toString()}`
    );
    suggestions.value = response.suggestions || [];
    selectedIndex.value = -1;
  } catch (error) {
    console.error("Failed to fetch suggestions:", error);
    suggestions.value = [];
  } finally {
    isLoading.value = false;
  }
}

// Handle input
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  emit("update:modelValue", value);

  // Debounce API calls
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }

  if (value.trim().length >= 2) {
    searchTimeout.value = setTimeout(() => {
      fetchSuggestions(value);
      isOpen.value = true;
    }, 300);
  } else {
    suggestions.value = [];
    isOpen.value = false;
  }
}

// Handle keyboard navigation
function handleKeydown(event: KeyboardEvent) {
  if (!isOpen.value || suggestions.value.length === 0) {
    return;
  }

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      selectedIndex.value = Math.min(
        selectedIndex.value + 1,
        suggestions.value.length - 1
      );
      break;
    case "ArrowUp":
      event.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
      break;
    case "Enter":
      event.preventDefault();
      if (selectedIndex.value >= 0) {
        selectSuggestion(suggestions.value[selectedIndex.value]);
      }
      break;
    case "Escape":
      event.preventDefault();
      isOpen.value = false;
      break;
  }
}

// Select a suggestion
function selectSuggestion(suggestion: ActivitySuggestion) {
  emit("update:modelValue", suggestion.name);
  emit("select", suggestion);
  isOpen.value = false;
  selectedIndex.value = -1;
}

// Handle focus
function handleFocus() {
  if (props.modelValue.trim().length >= 2 && suggestions.value.length > 0) {
    isOpen.value = true;
  }
}

// Handle blur
function handleBlur() {
  // Delay to allow click on suggestion
  setTimeout(() => {
    isOpen.value = false;
  }, 200);
}

// Clean up
onUnmounted(() => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }
});
</script>

<template>
  <div class="relative">
    <!-- Label -->
    <label
      v-if="label"
      class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
    >
      {{ label }}
    </label>

    <!-- Input -->
    <div class="relative">
      <input
        ref="inputRef"
        :value="modelValue"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-tada-500 focus:border-transparent pr-8"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="handleFocus"
        @blur="handleBlur"
      />

      <!-- Loading indicator -->
      <div
        v-if="isLoading"
        class="absolute right-2 top-1/2 -translate-y-1/2"
      >
        <svg
          class="animate-spin h-4 w-4 text-stone-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>

    <!-- Suggestions dropdown -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen && suggestions.length > 0"
        class="absolute z-10 w-full mt-1 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 max-h-60 overflow-auto"
      >
        <button
          v-for="(suggestion, index) in suggestions"
          :key="suggestion.name"
          type="button"
          class="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
          :class="
            index === selectedIndex
              ? 'bg-tada-50 dark:bg-tada-900/20'
              : ''
          "
          @mousedown.prevent
          @click="selectSuggestion(suggestion)"
        >
          <div class="flex flex-col">
            <span class="text-stone-900 dark:text-white">
              {{ suggestion.name }}
            </span>
            <span
              v-if="suggestion.category"
              class="text-xs text-stone-500 dark:text-stone-400"
            >
              {{ suggestion.category }}
            </span>
          </div>
          <span class="text-xs text-stone-400">
            {{ suggestion.count }}×
          </span>
        </button>
      </div>
    </Transition>
  </div>
</template>
