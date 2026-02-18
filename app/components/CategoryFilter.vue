<script setup lang="ts">
import { CATEGORY_DEFAULTS } from "~/utils/categoryDefaults";

/**
 * CategoryFilter - Category selection chips for filtering timeline
 * Simpler version of TimelineHeader showing only category chips
 */
interface Props {
  modelValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const selectedCategory = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// Categories from ontology (dynamically generated)
const categories = computed(() => [
  { value: "", label: "All", emoji: "📋" },
  ...Object.entries(CATEGORY_DEFAULTS).map(([slug, cat]) => ({
    value: slug,
    label: cat.label,
    emoji: cat.emoji,
  })),
]);
</script>

<template>
  <div class="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 max-w-full">
    <button
      v-for="cat in categories"
      :key="cat.value"
      type="button"
      class="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors"
      :class="
        selectedCategory === cat.value
          ? 'bg-tada-500 text-white shadow-md'
          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
      "
      @click="selectedCategory = cat.value"
    >
      <span>{{ cat.emoji }}</span>
      <span>{{ cat.label }}</span>
    </button>
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
