<template>
  <div class="space-y-6">
    <!-- Progress indicator -->
    <div class="flex items-center justify-between mb-8">
      <button
        class="text-sm text-text-light-muted dark:text-text-dark-muted hover:text-text-light dark:hover:text-text-dark"
        @click="$emit('cancel')"
      >
        ← Back
      </button>
      <div class="flex items-center gap-2">
        <div
          v-for="step in totalSteps"
          :key="step"
          :class="[
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
            currentStep === step
              ? 'bg-mindfulness-light dark:bg-mindfulness-dark text-white'
              : currentStep > step
              ? 'bg-mindfulness-light/30 dark:bg-mindfulness-dark/30 text-mindfulness-light dark:text-mindfulness-dark'
              : 'bg-pearl-mist dark:bg-cosmic-indigo text-text-light-muted dark:text-text-dark-muted',
          ]"
        >
          {{ step }}
        </div>
      </div>
    </div>

    <!-- Step 1: Upload File -->
    <div v-if="currentStep === 1">
      <h2
        class="text-2xl font-semibold text-text-light dark:text-text-dark mb-4"
      >
        Upload CSV File
      </h2>
      <div
        class="border-2 border-dashed border-pearl-mist dark:border-cosmic-indigo-light rounded-lg p-12 text-center hover:border-mindfulness-light dark:hover:border-mindfulness-dark transition-colors"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          class="hidden"
          @change="handleFileUpload"
        />
        <button
          class="inline-block px-6 py-3 bg-mindfulness-light dark:bg-mindfulness-dark text-white rounded-lg hover:opacity-90 transition-opacity"
          @click="$refs.fileInput?.click()"
        >
          Choose CSV File
        </button>
        <p
          class="mt-4 text-sm text-text-light-secondary dark:text-text-dark-secondary"
        >
          Maximum file size: 50MB
        </p>
        <p
          v-if="selectedFile"
          class="mt-2 text-sm text-text-light dark:text-text-dark font-medium"
        >
          Selected: {{ selectedFile.name }} ({{
            formatFileSize(selectedFile.size)
          }})
        </p>
      </div>
      <div v-if="csvData.length > 0" class="mt-6">
        <button
          class="px-6 py-3 bg-mindfulness-light dark:bg-mindfulness-dark text-white rounded-lg hover:opacity-90"
          @click="currentStep++"
        >
          Continue →
        </button>
      </div>
    </div>

    <!-- Step 2: Map Columns -->
    <div v-if="currentStep === 2">
      <h2
        class="text-2xl font-semibold text-text-light dark:text-text-dark mb-4"
      >
        Map Columns
      </h2>
      <p class="text-text-light-secondary dark:text-text-dark-secondary mb-6">
        Match your CSV columns to entry fields. Fields marked with * are
        recommended.
      </p>
      <div class="bg-white dark:bg-cosmic-indigo rounded-lg p-6 space-y-4">
        <div class="grid grid-cols-2 gap-4 items-center">
          <label
            class="text-sm font-medium text-text-light dark:text-text-dark"
          >
            Started At *
          </label>
          <select
            v-model="columnMapping.startedAt"
            class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-cosmic-black text-text-light dark:text-text-dark"
          >
            <option value="">-- Select Column --</option>
            <option v-for="field in csvFields" :key="field" :value="field">
              {{ field }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4 items-center">
          <label
            class="text-sm font-medium text-text-light dark:text-text-dark"
          >
            Duration *
          </label>
          <select
            v-model="columnMapping.duration"
            class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-cosmic-black text-text-light dark:text-text-dark"
          >
            <option value="">-- Select Column --</option>
            <option v-for="field in csvFields" :key="field" :value="field">
              {{ field }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4 items-center">
          <label
            class="text-sm font-medium text-text-light dark:text-text-dark"
          >
            Activity Name
          </label>
          <select
            v-model="columnMapping.name"
            class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-cosmic-black text-text-light dark:text-text-dark"
          >
            <option value="">-- Select Column --</option>
            <option v-for="field in csvFields" :key="field" :value="field">
              {{ field }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4 items-center">
          <label
            class="text-sm font-medium text-text-light dark:text-text-dark"
          >
            Notes
          </label>
          <select
            v-model="columnMapping.notes"
            class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-cosmic-black text-text-light dark:text-text-dark"
          >
            <option value="">-- Select Column --</option>
            <option v-for="field in csvFields" :key="field" :value="field">
              {{ field }}
            </option>
          </select>
        </div>
      </div>
      <div class="flex gap-4 mt-6">
        <button
          class="px-6 py-3 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg hover:bg-pearl-mist dark:hover:bg-cosmic-indigo"
          @click="currentStep--"
        >
          ← Back
        </button>
        <button
          class="px-6 py-3 bg-mindfulness-light dark:bg-mindfulness-dark text-white rounded-lg hover:opacity-90"
          :disabled="!columnMapping.startedAt || !columnMapping.duration"
          @click="currentStep++"
        >
          Continue →
        </button>
      </div>
    </div>

    <!-- Step 3: Configure Transforms -->
    <div v-if="currentStep === 3">
      <h2
        class="text-2xl font-semibold text-text-light dark:text-text-dark mb-4"
      >
        Configure Transforms
      </h2>
      <p class="text-text-light-secondary dark:text-text-dark-secondary mb-6">
        Configure how your data should be transformed
      </p>
      <div class="bg-white dark:bg-cosmic-indigo rounded-lg p-6 space-y-4">
        <div>
          <label
            class="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
          >
            Date Format
          </label>
          <input
            v-model="transforms.dateFormat"
            type="text"
            class="w-full px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-cosmic-black text-text-light dark:text-text-dark"
            placeholder="MM/DD/YYYY HH:mm:ss"
          />
        </div>
        <div>
          <label
            class="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
          >
            Timezone
          </label>
          <input
            v-model="transforms.timezone"
            type="text"
            class="w-full px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-cosmic-black text-text-light dark:text-text-dark"
            placeholder="America/New_York"
          />
        </div>
        <div>
          <label
            class="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
          >
            Default Category
          </label>
          <input
            v-model="transforms.defaultCategory"
            type="text"
            class="w-full px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-cosmic-black text-text-light dark:text-text-dark"
            placeholder="mindfulness"
          />
        </div>
      </div>
      <div class="flex gap-4 mt-6">
        <button
          class="px-6 py-3 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg hover:bg-pearl-mist dark:hover:bg-cosmic-indigo"
          @click="currentStep--"
        >
          ← Back
        </button>
        <button
          v-if="!props.recipe"
          class="px-6 py-3 border border-mindfulness-light dark:border-mindfulness-dark text-mindfulness-light dark:text-mindfulness-dark rounded-lg hover:bg-mindfulness-light/10 dark:hover:bg-mindfulness-dark/10"
          @click="showSaveRecipeDialog = true"
        >
          💾 Save as Recipe
        </button>
        <button
          class="px-6 py-3 bg-mindfulness-light dark:bg-mindfulness-dark text-white rounded-lg hover:opacity-90"
          @click="
            generatePreview();
            currentStep++;
          "
        >
          Preview →
        </button>
      </div>
    </div>

    <!-- Step 4: Preview -->
    <div v-if="currentStep === 4">
      <h2
        class="text-2xl font-semibold text-text-light dark:text-text-dark mb-4"
      >
        Preview Import
      </h2>
      <p class="text-text-light-secondary dark:text-text-dark-secondary mb-4">
        Review the first 10 rows. {{ csvData.length }} total rows will be
        imported.
      </p>
      <div class="bg-white dark:bg-cosmic-indigo rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead
              class="bg-pearl-mist dark:bg-cosmic-black text-text-light dark:text-text-dark"
            >
              <tr>
                <th class="px-4 py-2 text-left">Row</th>
                <th class="px-4 py-2 text-left">Date/Time</th>
                <th class="px-4 py-2 text-left">Duration</th>
                <th class="px-4 py-2 text-left">Activity</th>
                <th class="px-4 py-2 text-left">Category</th>
                <th class="px-4 py-2 text-left">Warnings</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-pearl-mist dark:divide-cosmic-indigo">
              <tr
                v-for="entry in previewEntries"
                :key="entry._rowIndex"
                class="hover:bg-pearl-mist/50 dark:hover:bg-cosmic-black/50"
              >
                <td class="px-4 py-2">{{ entry._rowIndex + 1 }}</td>
                <td class="px-4 py-2">{{ entry.startedAt || "—" }}</td>
                <td class="px-4 py-2">{{ entry.duration || "—" }}</td>
                <td class="px-4 py-2">
                  {{ entry.name || entry.subcategory || "—" }}
                </td>
                <td class="px-4 py-2">
                  {{ entry.category }}/{{ entry.subcategory }}
                </td>
                <td class="px-4 py-2">
                  <span
                    v-if="validationWarnings[entry._rowIndex]"
                    class="text-xs text-gold-light dark:text-gold-dark"
                  >
                    ⚠️ {{ validationWarnings[entry._rowIndex].join(", ") }}
                  </span>
                  <span
                    v-else
                    class="text-xs text-mindfulness-light dark:text-mindfulness-dark"
                    >✓</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="flex gap-4 mt-6">
        <button
          class="px-6 py-3 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg hover:bg-pearl-mist dark:hover:bg-cosmic-indigo"
          @click="currentStep--"
        >
          ← Back
        </button>
        <button
          class="px-6 py-3 bg-gold-light dark:bg-gold-dark text-white rounded-lg hover:opacity-90"
          :disabled="isImporting"
          @click="startImport"
        >
          {{
            isImporting ? "Importing..." : `Import ${csvData.length} Entries`
          }}
        </button>
      </div>
    </div>

    <!-- Step 5: Results -->
    <div v-if="currentStep === 5">
      <h2
        class="text-2xl font-semibold text-text-light dark:text-text-dark mb-4"
      >
        Import Complete ✅
      </h2>
      <div
        v-if="importResults"
        class="bg-white dark:bg-cosmic-indigo rounded-lg p-6 space-y-4"
      >
        <div class="grid grid-cols-2 gap-4">
          <div
            class="p-4 bg-mindfulness-light/10 dark:bg-mindfulness-dark/10 rounded-lg"
          >
            <div
              class="text-3xl font-bold text-mindfulness-light dark:text-mindfulness-dark"
            >
              {{ importResults.successful }}
            </div>
            <div
              class="text-sm text-text-light-secondary dark:text-text-dark-secondary"
            >
              Imported Successfully
            </div>
          </div>
          <div class="p-4 bg-gold-light/10 dark:bg-gold-dark/10 rounded-lg">
            <div class="text-3xl font-bold text-gold-light dark:text-gold-dark">
              {{ importResults.skipped }}
            </div>
            <div
              class="text-sm text-text-light-secondary dark:text-text-dark-secondary"
            >
              Skipped (Duplicates)
            </div>
          </div>
        </div>
        <div
          v-if="importResults.failed > 0"
          class="p-4 bg-red-500/10 rounded-lg"
        >
          <div class="text-3xl font-bold text-red-500">
            {{ importResults.failed }}
          </div>
          <div
            class="text-sm text-text-light-secondary dark:text-text-dark-secondary"
          >
            Failed to Import
          </div>
        </div>
        <div
          class="pt-4 text-sm text-text-light-secondary dark:text-text-dark-secondary"
        >
          Total rows processed: {{ importResults.total }}
        </div>
      </div>
      <div class="mt-6">
        <button
          class="px-6 py-3 bg-mindfulness-light dark:bg-mindfulness-dark text-white rounded-lg hover:opacity-90"
          @click="$emit('complete')"
        >
          View Entries →
        </button>
      </div>
    </div>

    <!-- Save Recipe Dialog -->
    <div
      v-if="showSaveRecipeDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="showSaveRecipeDialog = false"
    >
      <div
        class="bg-white dark:bg-cosmic-indigo rounded-lg p-6 max-w-md w-full mx-4"
        @click.stop
      >
        <h3
          class="text-xl font-semibold text-text-light dark:text-text-dark mb-4"
        >
          Save Import Recipe
        </h3>
        <div class="space-y-4">
          <div>
            <label
              class="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
            >
              Recipe Name *
            </label>
            <input
              v-model="recipeName"
              type="text"
              placeholder="My Custom Import"
              class="w-full px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-cosmic-black text-text-light dark:text-text-dark"
            />
          </div>
          <div>
            <label
              class="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
            >
              Description
            </label>
            <textarea
              v-model="recipeDescription"
              rows="3"
              placeholder="Describe what this import recipe is for..."
              class="w-full px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-cosmic-black text-text-light dark:text-text-dark"
            ></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button
            class="flex-1 px-4 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg hover:bg-pearl-mist dark:hover:bg-cosmic-indigo"
            @click="showSaveRecipeDialog = false"
          >
            Cancel
          </button>
          <button
            class="flex-1 px-4 py-2 bg-mindfulness-light dark:bg-mindfulness-dark text-white rounded-lg hover:opacity-90"
            :disabled="isSavingRecipe"
            @click="saveRecipe"
          >
            {{ isSavingRecipe ? "Saving..." : "Save Recipe" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Papa from "papaparse";
import type { ImportRecipe } from "~/server/db/schema";

const props = defineProps<{
  recipe: ImportRecipe | null;
}>();

const emit = defineEmits<{
  complete: [];
  cancel: [];
}>();

const currentStep = ref(1);
const totalSteps = 5;

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const csvData = ref<Record<string, string>[]>([]);
const csvFields = ref<string[]>([]);
const parseError = ref<string | null>(null);

// Column mapping: { fieldName: csvColumnName }
const columnMapping = ref<Record<string, string>>({});

// Transform configuration
const transforms = ref({
  dateFormat: "MM/DD/YYYY HH:mm:ss",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  durationFormat: "H:mm:ss",
  defaultCategory: "mindfulness",
  defaultSubcategory: "",
});

// Preview data
const previewEntries = ref<any[]>([]);
const validationWarnings = ref<Record<number, string[]>>({});

// Import progress
const isImporting = ref(false);
const importProgress = ref(0);
const importResults = ref<{
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: any[];
} | null>(null);

// Recipe save
const showSaveRecipeDialog = ref(false);
const recipeName = ref("");
const recipeDescription = ref("");
const isSavingRecipe = ref(false);

// Initialize from recipe if provided
watchEffect(() => {
  if (props.recipe) {
    columnMapping.value = props.recipe.columnMapping || {};
    transforms.value = {
      ...transforms.value,
      ...(props.recipe.transforms || {}),
    };
  }
});

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    parseError.value = "File size exceeds 50MB limit";
    return;
  }

  selectedFile.value = file;
  parseError.value = null;

  // Parse CSV with Papa Parse
  Papa.parse<Record<string, string>>(file, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
    complete: (results) => {
      csvData.value = results.data;
      csvFields.value = results.meta.fields || [];

      // Auto-detect column mappings if recipe not provided
      if (!props.recipe) {
        autoDetectMappings();
      }
    },
    error: (error: Error) => {
      parseError.value = `Failed to parse CSV: ${error.message}`;
    },
  });
}

function autoDetectMappings() {
  const mapping: Record<string, string> = {};

  // Common column name patterns
  const patterns: Record<string, string[]> = {
    startedAt: ["started at", "start", "date", "datetime", "timestamp"],
    duration: ["duration", "time", "length"],
    name: ["activity", "name", "type", "title"],
    category: ["category", "cat"],
    subcategory: ["subcategory", "subcat", "sub"],
    notes: ["notes", "note", "description", "desc"],
  };

  for (const field of csvFields.value) {
    const fieldLower = field.toLowerCase();

    for (const [targetField, keywords] of Object.entries(patterns)) {
      if (keywords.some((kw) => fieldLower.includes(kw))) {
        mapping[targetField] = field;
        break;
      }
    }
  }

  columnMapping.value = mapping;
}

function generatePreview() {
  const preview: any[] = [];
  const warnings: Record<number, string[]> = {};

  // Preview first 10 rows
  const previewCount = Math.min(10, csvData.value.length);

  for (let i = 0; i < previewCount; i++) {
    const row = csvData.value[i];
    const entry: any = {
      _rowIndex: i,
    };

    // Apply column mappings
    for (const [targetField, csvColumn] of Object.entries(
      columnMapping.value
    )) {
      if (csvColumn && row[csvColumn]) {
        entry[targetField] = row[csvColumn];
      }
    }

    // Apply transforms
    if (entry.startedAt) {
      // Parse date (simplified - use csvParser utility in production)
      entry._startedAtParsed = entry.startedAt;
    }

    if (entry.duration) {
      // Parse duration (simplified - use csvParser utility in production)
      entry._durationParsed = entry.duration;
    }

    // Set defaults
    entry.category = transforms.value.defaultCategory;
    if (transforms.value.defaultSubcategory) {
      entry.subcategory = transforms.value.defaultSubcategory;
    } else if (entry.name) {
      // Use name as subcategory if not specified
      entry.subcategory = entry.name;
    }

    // Validate and collect warnings
    const rowWarnings: string[] = [];

    if (!entry.startedAt && !entry.timestamp) {
      rowWarnings.push("Missing date/time");
    }

    if (!entry.duration && !entry.durationSeconds) {
      rowWarnings.push("Missing duration");
    }

    if (rowWarnings.length > 0) {
      warnings[i] = rowWarnings;
    }

    preview.push(entry);
  }

  previewEntries.value = preview;
  validationWarnings.value = warnings;
}

async function startImport() {
  isImporting.value = true;
  importProgress.value = 0;

  try {
    // Transform all CSV rows to entry format
    const entries = csvData.value.map((row, index) => {
      const entry: any = {
        type: "timed",
      };

      // Apply column mappings
      for (const [targetField, csvColumn] of Object.entries(
        columnMapping.value
      )) {
        if (csvColumn && row[csvColumn]) {
          entry[targetField] = row[csvColumn];
        }
      }

      // Apply transforms
      if (entry.startedAt) {
        // TODO: Use csvParser utility for proper parsing
        entry.startedAt = entry.startedAt;
      }

      if (entry.duration) {
        // TODO: Use csvParser utility for proper parsing
        entry.durationSeconds = 0; // Parse duration string
      }

      // Set defaults
      entry.category = transforms.value.defaultCategory;
      if (transforms.value.defaultSubcategory) {
        entry.subcategory = transforms.value.defaultSubcategory;
      } else if (entry.name) {
        entry.subcategory = entry.name;
      }

      entry.source = props.recipe?.name || "csv-import";
      entry.externalId = `${selectedFile.value?.name}-${index}`;

      return entry;
    });

    // Call import API
    const response = await $fetch("/api/import/entries", {
      method: "POST",
      body: {
        entries,
        source: props.recipe?.name || "csv-import",
        recipeName: props.recipe?.name || "Custom Import",
        recipeId: props.recipe?.id || null,
        filename: selectedFile.value?.name || "unknown.csv",
      },
    });

    importResults.value = response.results;
    importProgress.value = 100;
    currentStep.value = 5;
  } catch (error) {
    console.error("Import failed:", error);
    parseError.value = "Import failed. Please try again.";
  } finally {
    isImporting.value = false;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

async function saveRecipe() {
  if (!recipeName.value.trim()) {
    alert("Please enter a recipe name");
    return;
  }

  isSavingRecipe.value = true;

  try {
    await $fetch("/api/import/recipes", {
      method: "POST",
      body: {
        name: recipeName.value,
        description: recipeDescription.value,
        columnMapping: columnMapping.value,
        transforms: transforms.value,
      },
    });

    showSaveRecipeDialog.value = false;
    recipeName.value = "";
    recipeDescription.value = "";

    alert("Recipe saved successfully! You can use it for future imports.");
  } catch (error) {
    console.error("Failed to save recipe:", error);
    alert("Failed to save recipe. Please try again.");
  } finally {
    isSavingRecipe.value = false;
  }
}
</script>
