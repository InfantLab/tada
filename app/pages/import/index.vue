<template>
  <div class="min-h-screen bg-pearl-white dark:bg-cosmic-black p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1
          class="text-3xl font-semibold text-text-light dark:text-text-dark mb-2"
        >
          Import Data
        </h1>
        <p class="text-text-light-secondary dark:text-text-dark-secondary">
          Import your activity history from CSV files. Save custom mappings as
          recipes for future imports.
        </p>
      </div>

      <!-- Import wizard or recipe selector -->
      <div v-if="!selectedRecipe && !showCustomImport" class="space-y-6">
        <!-- Built-in recipes -->
        <div>
          <h2
            class="text-xl font-medium text-text-light dark:text-text-dark mb-4"
          >
            Built-in Imports
          </h2>
          <div class="grid gap-4 md:grid-cols-2">
            <button
              v-for="recipe in builtInRecipes"
              :key="recipe.id"
              class="text-left p-6 bg-white dark:bg-cosmic-indigo rounded-lg border border-pearl-mist dark:border-cosmic-indigo-light hover:border-gold-light dark:hover:border-gold-dark transition-colors"
              @click="selectRecipe(recipe)"
            >
              <div class="flex items-start justify-between mb-2">
                <h3
                  class="text-lg font-medium text-text-light dark:text-text-dark"
                >
                  {{ recipe.name }}
                </h3>
                <span
                  class="text-xs px-2 py-1 rounded bg-gold-highlight/20 text-gold-light dark:bg-gold-dark/20 dark:text-gold-dark"
                  >Built-in</span
                >
              </div>
              <p
                class="text-sm text-text-light-secondary dark:text-text-dark-secondary"
              >
                {{ recipe.description }}
              </p>
            </button>
          </div>
        </div>

        <!-- Custom recipes -->
        <div v-if="customRecipes.length > 0">
          <h2
            class="text-xl font-medium text-text-light dark:text-text-dark mb-4"
          >
            Your Recipes
          </h2>
          <div class="grid gap-4 md:grid-cols-2">
            <button
              v-for="recipe in customRecipes"
              :key="recipe.id"
              class="text-left p-6 bg-white dark:bg-cosmic-indigo rounded-lg border border-pearl-mist dark:border-cosmic-indigo-light hover:border-mindfulness-light dark:hover:border-mindfulness-dark transition-colors"
              @click="selectRecipe(recipe)"
            >
              <div class="flex items-start justify-between mb-2">
                <h3
                  class="text-lg font-medium text-text-light dark:text-text-dark"
                >
                  {{ recipe.name }}
                </h3>
                <span
                  class="text-xs text-text-light-muted dark:text-text-dark-muted"
                  >Used {{ recipe.useCount }} times</span
                >
              </div>
              <p
                v-if="recipe.description"
                class="text-sm text-text-light-secondary dark:text-text-dark-secondary"
              >
                {{ recipe.description }}
              </p>
              <p
                v-if="recipe.lastUsedAt"
                class="text-xs text-text-light-muted dark:text-text-dark-muted mt-2"
              >
                Last used: {{ formatDate(recipe.lastUsedAt) }}
              </p>
            </button>
          </div>
        </div>

        <!-- Custom import button -->
        <div>
          <button
            class="w-full p-6 bg-white dark:bg-cosmic-indigo rounded-lg border-2 border-dashed border-pearl-mist dark:border-cosmic-indigo-light hover:border-mindfulness-light dark:hover:border-mindfulness-dark transition-colors"
            @click="showCustomImport = true"
          >
            <div class="text-center">
              <span class="text-4xl mb-2 block">📊</span>
              <h3
                class="text-lg font-medium text-text-light dark:text-text-dark mb-1"
              >
                Custom CSV Import
              </h3>
              <p
                class="text-sm text-text-light-secondary dark:text-text-dark-secondary"
              >
                Import from any CSV file and create your own mapping recipe
              </p>
            </div>
          </button>
        </div>

        <!-- Import history link -->
        <div class="text-center pt-4">
          <NuxtLink
            to="/import/history"
            class="text-sm text-mindfulness-light dark:text-mindfulness-dark hover:underline"
          >
            View import history
          </NuxtLink>
        </div>
      </div>

      <!-- Import wizard (shown after selecting recipe or custom import) -->
      <div v-else>
        <ImportWizard
          :recipe="selectedRecipe"
          @complete="handleImportComplete"
          @cancel="handleCancel"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ImportRecipe } from "~/server/db/schema";

definePageMeta({
  middleware: "auth" as const,
});

const selectedRecipe = ref<ImportRecipe | null>(null);
const showCustomImport = ref(false);
const recipes = ref<ImportRecipe[]>([]);

const builtInRecipes = computed(() => recipes.value.filter((r) => r.isBuiltIn));

const customRecipes = computed(() => recipes.value.filter((r) => !r.isBuiltIn));

// Load recipes on mount
onMounted(async () => {
  try {
    const response = await $fetch<{ recipes: ImportRecipe[] }>(
      "/api/import/recipes"
    );
    recipes.value = response.recipes;
  } catch (error) {
    console.error("Failed to load recipes:", error);
  }
});

function selectRecipe(recipe: ImportRecipe) {
  selectedRecipe.value = recipe;
}

function handleImportComplete() {
  // Reset state
  selectedRecipe.value = null;
  showCustomImport.value = false;

  // Navigate to history or entries
  navigateTo("/");
}

function handleCancel() {
  selectedRecipe.value = null;
  showCustomImport.value = false;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}
</script>
