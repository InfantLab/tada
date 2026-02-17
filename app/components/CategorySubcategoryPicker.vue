<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    category: string | null;
    subcategory: string | null;
    /** "compact" for modal contexts, "spacious" for full-page editors */
    variant?: "compact" | "spacious";
  }>(),
  {
    variant: "spacious",
  },
);

const emit = defineEmits<{
  (e: "update:category", value: string): void;
  (e: "update:subcategory", value: string): void;
}>();

// Load preferences for category visibility
const { loadPreferences } = usePreferences();
onMounted(() => {
  loadPreferences();
});

// Shared form logic
const categoryRef = computed(() => props.category);
const { categoryOptions, subcategoryOptions } = useEntryForm(categoryRef);

function handleCategoryChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit("update:category", value);
  // Reset subcategory when category changes
  emit("update:subcategory", "");
}

function handleSubcategoryChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit("update:subcategory", value);
}

// Style variants
const gridClass = computed(() =>
  props.variant === "compact"
    ? "grid grid-cols-2 gap-3"
    : "grid grid-cols-2 gap-4",
);

const wrapperClass = computed(() =>
  props.variant === "compact" ? "space-y-1" : "",
);

const labelClass = computed(() =>
  props.variant === "compact"
    ? "block text-sm font-medium text-stone-700 dark:text-stone-300"
    : "block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2",
);

const selectClass = computed(() =>
  props.variant === "compact"
    ? "w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-tada-500 focus:border-transparent disabled:opacity-50"
    : "w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 bg-white/80 dark:bg-stone-900/80 text-stone-900 dark:text-white focus:ring-2 focus:ring-stone-400/50 focus:border-stone-300 dark:focus:border-stone-500 disabled:opacity-50",
);
</script>

<template>
  <div :class="gridClass">
    <div :class="wrapperClass">
      <label :class="labelClass">Category</label>
      <select
        :value="category ?? ''"
        :class="selectClass"
        @change="handleCategoryChange"
      >
        <option value="">
          {{ variant === "compact" ? "None" : "No category" }}
        </option>
        <option
          v-for="cat in categoryOptions"
          :key="cat.value"
          :value="cat.value"
        >
          {{ cat.emoji }} {{ cat.label }}
        </option>
      </select>
    </div>
    <div :class="wrapperClass">
      <label :class="labelClass">Subcategory</label>
      <select
        :value="subcategory ?? ''"
        :disabled="!category"
        :class="selectClass"
        @change="handleSubcategoryChange"
      >
        <option value="">
          {{ variant === "compact" ? "None" : "No subcategory" }}
        </option>
        <option
          v-for="sub in subcategoryOptions"
          :key="sub.value"
          :value="sub.value"
        >
          {{ sub.emoji }} {{ sub.label }}
        </option>
      </select>
    </div>
  </div>
</template>
