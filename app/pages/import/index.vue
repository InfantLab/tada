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
      <div v-if="!selectedRecipe && !showCustomImport && !selectedImporterId" class="space-y-6">
        <!-- Registry-driven importers -->
        <div v-if="registeredImporters.length > 0">
          <h2
            class="text-xl font-medium text-text-light dark:text-text-dark mb-4"
          >
            Built-in Imports
          </h2>
          <div class="grid gap-4 md:grid-cols-2">
            <button
              v-for="importer in registeredImporters"
              :key="importer.id"
              class="text-left p-6 bg-white dark:bg-cosmic-indigo rounded-lg border border-pearl-mist dark:border-cosmic-indigo-light hover:border-tada-300 dark:hover:border-tada-600 transition-colors"
              @click="selectImporter(importer.id)"
            >
              <div class="flex items-start justify-between mb-2">
                <h3
                  class="text-lg font-medium text-text-light dark:text-text-dark"
                >
                  {{ importer.name }}
                </h3>
                <span
                  class="text-xs px-2 py-1 rounded bg-tada-100/20 text-tada-700 dark:bg-tada-600/20 dark:text-tada-300"
                  >Built-in</span
                >
              </div>
              <p
                class="text-sm text-text-light-secondary dark:text-text-dark-secondary"
              >
                {{ importer.description }}
              </p>
            </button>
          </div>
        </div>

        <!-- Legacy built-in recipes (from API) -->
        <div v-if="builtInRecipes.length > 0">
          <div class="grid gap-4 md:grid-cols-2">
            <button
              v-for="recipe in builtInRecipes"
              :key="recipe.id"
              class="text-left p-6 bg-white dark:bg-cosmic-indigo rounded-lg border border-pearl-mist dark:border-cosmic-indigo-light hover:border-tada-300 dark:hover:border-tada-600 transition-colors"
              @click="selectRecipe(recipe)"
            >
              <div class="flex items-start justify-between mb-2">
                <h3
                  class="text-lg font-medium text-text-light dark:text-text-dark"
                >
                  {{ recipe.name }}
                </h3>
                <span
                  class="text-xs px-2 py-1 rounded bg-tada-100/20 text-tada-700 dark:bg-tada-600/20 dark:text-tada-300"
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

        <!-- Insight Timer instructions (expandable) -->
        <div
          v-if="builtInRecipes.length > 0 && builtInRecipes[0]!.name === 'Insight Timer'"
          class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4"
        >
          <button
            class="w-full flex items-center justify-between text-left"
            @click="
              showInsightTimerInstructions = !showInsightTimerInstructions
            "
          >
            <div class="flex items-center gap-2">
              <span class="text-lg">ℹ️</span>
              <span class="font-medium text-gray-900 dark:text-gray-100">
                How to export from Insight Timer
              </span>
            </div>
            <span class="text-gray-500">{{
              showInsightTimerInstructions ? "▼" : "▶"
            }}</span>
          </button>

          <div
            v-if="showInsightTimerInstructions"
            class="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300"
          >
            <ol class="list-decimal list-inside space-y-2 pl-2">
              <li>Open the Insight Timer app</li>
              <li>Go to <strong>Settings</strong> (gear icon)</li>
              <li>Select <strong>Features & Preferences</strong></li>
              <li>Tap <strong>Sessions</strong></li>
              <li>Select <strong>Export Data</strong></li>
              <li>Choose export format: <strong>CSV</strong></li>
              <li>Share or save the CSV file</li>
              <li>Upload the file using the Insight Timer recipe above</li>
            </ol>
            <p class="text-xs text-gray-500 dark:text-gray-500 italic mt-3">
              Note: Export includes all meditation sessions with dates,
              durations, and activity types.
            </p>
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
import { getRegisteredImporters } from "~/registry/importers";

// Auth is handled by global middleware

const selectedRecipe = ref<ImportRecipe | null>(null);
const showCustomImport = ref(false);
const showInsightTimerInstructions = ref(false);
const recipes = ref<ImportRecipe[]>([]);

// Registry-driven built-in importers
const registeredImporters = computed(() =>
  Array.from(getRegisteredImporters().values()),
);

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

const selectedImporterId = ref<string | null>(null);

function selectImporter(id: string) {
  selectedImporterId.value = id;
  // For now, delegate to the existing ImportWizard with the importer ID context
  showCustomImport.value = true;
}

function selectRecipe(recipe: ImportRecipe) {
  selectedRecipe.value = recipe;
}

function handleImportComplete() {
  selectedRecipe.value = null;
  selectedImporterId.value = null;
  showCustomImport.value = false;
  navigateTo("/");
}

function handleCancel() {
  selectedRecipe.value = null;
  selectedImporterId.value = null;
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
