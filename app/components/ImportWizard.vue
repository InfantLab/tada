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
      <h2 class="text-2xl font-semibold text-text-light dark:text-text-dark mb-4">
        Upload CSV File
      </h2>
      <div
        class="border-2 border-dashed border-pearl-mist dark:border-cosmic-indigo-light rounded-lg p-12 text-center hover:border-mindfulness-light dark:hover:border-mindfulness-dark transition-colors"
      >
        <input
          type="file"
          accept=".csv"
          class="hidden"
          @change="handleFileUpload"
          ref="fileInput"
        />
        <button
          class="inline-block px-6 py-3 bg-mindfulness-light dark:bg-mindfulness-dark text-white rounded-lg hover:opacity-90 transition-opacity"
          @click="$refs.fileInput?.click()"
        >
          Choose CSV File
        </button>
        <p class="mt-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Maximum file size: 50MB
        </p>
        <p
          v-if="selectedFile"
          class="mt-2 text-sm text-text-light dark:text-text-dark font-medium"
        >
          Selected: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
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
      <h2 class="text-2xl font-semibold text-text-light dark:text-text-dark mb-4">
        Map Columns
        </h2>
      <p class="text-text-light-secondary dark:text-text-dark-secondary mb-6">
        Match CSV columns to activity fields. Required fields are marked with *.
      </p>
      <div class="space-y-4">
        <!-- Column mapping UI placeholder -->
        <p class="text-center text-text-light-muted dark:text-text-dark-muted py-8">
          Column mapping interface will be implemented here
        </p>
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
          @click="currentStep++"
        >
          Continue →
        </button>
      </div>
    </div>

    <!-- Step 3: Configure Transforms -->
    <div v-if="currentStep === 3">
      <h2 class="text-2xl font-semibold text-text-light dark:text-text-dark mb-4">
        Configure Transforms
      </h2>
      <p class="text-text-light-secondary dark:text-text-dark-secondary mb-6">
        Configure how your data should be transformed
      </p>
      <div class="space-y-4">
        <!-- Transform config UI placeholder -->
        <p class="text-center text-text-light-muted dark:text-text-dark-muted py-8">
          Transform configuration interface will be implemented here
        </p>
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
          @click="currentStep++"
        >
          Preview →
        </button>
      </div>
    </div>

    <!-- Step 4: Preview -->
    <div v-if="currentStep === 4">
      <h2 class="text-2xl font-semibold text-text-light dark:text-text-dark mb-4">
        Preview Import
      </h2>
      <p class="text-text-light-secondary dark:text-text-dark-secondary mb-6">
        Review the data before importing
      </p>
      <div class="space-y-4">
        <!-- Preview table placeholder -->
        <p class="text-center text-text-light-muted dark:text-text-dark-muted py-8">
          Preview table will be implemented here
        </p>
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
          @click="startImport"
          :disabled="isImporting"
        >
          {{ isImporting ? "Importing..." : "Start Import" }}
        </button>
      </div>
    </div>

    <!-- Step 5: Results -->
    <div v-if="currentStep === 5">
      <h2 class="text-2xl font-semibold text-text-light dark:text-text-dark mb-4">
        Import Complete
      </h2>
      <div class="space-y-4">
        <!-- Results summary placeholder -->
        <p class="text-center text-text-light-muted dark:text-text-dark-muted py-8">
          Import results will be shown here
        </p>
      </div>
      <div class="mt-6">
        <button
          class="px-6 py-3 bg-mindfulness-light dark:bg-mindfulness-dark text-white rounded-lg hover:opacity-90"
          @click="$emit('complete')"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
const csvData = ref<Record<string, unknown>[]>([]);
const isImporting = ref(false);

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) return;
  
  selectedFile.value = file;
  
  // TODO: Parse CSV using Papa Parse
  // For now, just simulate data
  csvData.value = [{ test: "data" }];
}

async function startImport() {
  isImporting.value = true;
  
  // TODO: Call import API
  
  setTimeout(() => {
    isImporting.value = false;
    currentStep.value = 5;
  }, 2000);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>
