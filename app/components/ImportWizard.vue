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
        class="border-2 border-dashed rounded-lg p-12 text-center transition-all"
        :class="
          isDragOver
            ? 'border-mindfulness-light dark:border-mindfulness-dark bg-mindfulness-light/5 dark:bg-mindfulness-dark/5'
            : 'border-pearl-mist dark:border-cosmic-indigo-light hover:border-mindfulness-light dark:hover:border-mindfulness-dark'
        "
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="handleFileDrop"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          class="hidden"
          @change="handleFileUpload"
        />
        <div
          v-if="isDragOver"
          class="text-mindfulness-light dark:text-mindfulness-dark text-lg font-medium mb-4"
        >
          📂 Drop CSV file here
        </div>
        <button
          class="inline-block px-6 py-3 bg-mindfulness-light dark:bg-mindfulness-dark text-white rounded-lg hover:opacity-90 transition-opacity"
          @click="() => fileInput?.click()"
        >
          Choose CSV File
        </button>
        <p class="mt-4 text-sm text-gray-500 dark:text-gray-500">
          or drag and drop here
        </p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-500">
          Maximum file size: 50MB
        </p>
        <p
          v-if="selectedFile"
          class="mt-4 text-sm text-text-light dark:text-text-dark font-medium"
        >
          ✓ Selected: {{ selectedFile.name }} ({{
            formatSize(selectedFile.size)
          }})
        </p>
        <p v-if="parseError" class="mt-4 text-sm text-red-500">
          ⚠️ {{ parseError }}
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

    <!-- Step 2: Map & Configure -->
    <div v-if="currentStep === 2">
      <h2
        class="text-2xl font-semibold text-text-light dark:text-text-dark mb-4"
      >
        Map Columns & Configure
      </h2>
      <p class="text-text-light-secondary dark:text-text-dark-secondary mb-6">
        Match your CSV columns to entry fields and configure data
        transformation. Fields marked with * are required.
      </p>

      <!-- Recipe Selector -->
      <div
        class="mb-6 p-4 bg-mindfulness-light/5 dark:bg-mindfulness-dark/5 rounded-lg border border-mindfulness-light/20 dark:border-mindfulness-dark/20"
      >
        <div class="flex items-center gap-4">
          <label
            class="text-sm font-medium text-text-light dark:text-text-dark whitespace-nowrap"
          >
            Load Recipe:
          </label>
          <select
            v-model="selectedRecipeId"
            class="flex-1 px-3 py-2 bg-white dark:bg-cosmic-indigo border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg text-text-light dark:text-text-dark"
            @change="loadSelectedRecipe"
          >
            <option :value="null">-- Select a saved recipe --</option>
            <option
              v-for="recipeOption in userRecipes"
              :key="recipeOption.id"
              :value="recipeOption.id"
            >
              {{ recipeOption.name }}
            </option>
          </select>
          <button
            v-if="selectedRecipeId && currentRecipePreviousVersions.length > 0"
            class="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors whitespace-nowrap"
            @click="showVersionHistory = !showVersionHistory"
          >
            📜 History ({{ currentRecipePreviousVersions.length }})
          </button>
          <button
            v-if="selectedRecipeId"
            class="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            @click="deleteSelectedRecipe"
          >
            🗑 Delete
          </button>
        </div>

        <!-- Version History Panel -->
        <div
          v-if="showVersionHistory && currentRecipePreviousVersions.length > 0"
          class="mt-4 p-3 bg-white dark:bg-cosmic-indigo rounded-lg border border-pearl-mist dark:border-cosmic-indigo-light"
        >
          <h4
            class="text-sm font-semibold text-text-light dark:text-text-dark mb-2"
          >
            Previous Versions (last
            {{ Math.min(3, currentRecipePreviousVersions.length) }})
          </h4>
          <div class="space-y-2">
            <div
              v-for="(version, index) in currentRecipePreviousVersions"
              :key="index"
              class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <span
                class="text-xs text-text-light-muted dark:text-text-dark-muted"
              >
                {{ new Date(version.savedAt).toLocaleString() }}
              </span>
              <button
                class="px-2 py-1 text-xs bg-blue-600 dark:bg-blue-500 text-white rounded hover:opacity-90"
                @click="restoreVersion(index)"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Preview -->
      <div class="bg-white dark:bg-cosmic-indigo rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Data Preview
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th
                  v-for="field in csvFields"
                  :key="field"
                  class="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100"
                >
                  {{ field }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-pearl-mist dark:divide-cosmic-indigo">
              <tr
                v-for="(row, idx) in csvData.slice(0, 5)"
                :key="idx"
                class="hover:bg-pearl-mist/50 dark:hover:bg-cosmic-black/50"
              >
                <td
                  v-for="field in csvFields"
                  :key="field"
                  class="px-4 py-2 text-gray-900 dark:text-gray-100"
                >
                  {{ row[field] || "—" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Showing first 5 of {{ csvData.length }} rows
        </p>
      </div>

      <!-- Column Mapping -->
      <div class="bg-white dark:bg-cosmic-indigo rounded-lg p-6 space-y-4 mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Column Mapping
        </h3>

        <!-- Timestamp (when it happened / started) -->
        <div class="space-y-1">
          <div class="grid grid-cols-2 gap-4 items-center">
            <label
              class="text-sm font-medium text-text-light dark:text-text-dark"
            >
              Date/Time <span class="text-red-500">*</span>
            </label>
            <select
              v-model="columnMapping['timestamp']"
              class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">-- Select Column --</option>
              <option v-for="field in csvFields" :key="field" :value="field">
                {{ field }}
              </option>
            </select>
          </div>
          <div
            v-if="columnDetections['timestamp']"
            :class="
              getConfidenceColor(columnDetections['timestamp'].confidence)
            "
            class="text-xs pl-1"
          >
            {{ getConfidenceBadge(columnDetections["timestamp"].confidence) }}:
            {{ columnDetections["timestamp"].reason }}
          </div>
        </div>

        <!-- Duration -->
        <div class="space-y-1">
          <div class="grid grid-cols-2 gap-4 items-center">
            <label
              class="text-sm font-medium text-text-light dark:text-text-dark"
            >
              Duration <span class="text-red-500">*</span>
            </label>
            <select
              v-model="columnMapping['duration']"
              class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">-- Select Column --</option>
              <option v-for="field in csvFields" :key="field" :value="field">
                {{ field }}
              </option>
            </select>
          </div>
          <div
            v-if="columnDetections['duration']"
            :class="getConfidenceColor(columnDetections['duration'].confidence)"
            class="text-xs pl-1"
          >
            {{ getConfidenceBadge(columnDetections["duration"].confidence) }}:
            {{ columnDetections["duration"].reason }}
          </div>
        </div>

        <!-- Name -->
        <div class="space-y-1">
          <div class="grid grid-cols-2 gap-4 items-center">
            <label
              class="text-sm font-medium text-text-light dark:text-text-dark"
            >
              Activity Name
            </label>
            <select
              v-model="columnMapping['name']"
              class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">-- Select Column --</option>
              <option v-for="field in csvFields" :key="field" :value="field">
                {{ field }}
              </option>
            </select>
          </div>
          <div
            v-if="columnDetections['name']"
            :class="getConfidenceColor(columnDetections['name'].confidence)"
            class="text-xs pl-1"
          >
            {{ getConfidenceBadge(columnDetections["name"].confidence) }}:
            {{ columnDetections["name"].reason }}
          </div>
        </div>

        <!-- Category -->
        <div class="space-y-1">
          <div class="grid grid-cols-2 gap-4 items-center">
            <label
              class="text-sm font-medium text-text-light dark:text-text-dark"
            >
              Category
            </label>
            <select
              v-model="columnMapping['category']"
              class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">-- Use Default --</option>
              <option v-for="field in csvFields" :key="field" :value="field">
                {{ field }}
              </option>
            </select>
          </div>
          <div
            v-if="columnDetections['category']"
            :class="getConfidenceColor(columnDetections['category'].confidence)"
            class="text-xs pl-1"
          >
            {{ getConfidenceBadge(columnDetections["category"].confidence) }}:
            {{ columnDetections["category"].reason }}
          </div>
        </div>

        <!-- Subcategory -->
        <div class="space-y-1">
          <div class="grid grid-cols-2 gap-4 items-center">
            <label
              class="text-sm font-medium text-text-light dark:text-text-dark"
            >
              Subcategory
            </label>
            <select
              v-model="columnMapping['subcategory']"
              class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">-- Use Name --</option>
              <option v-for="field in csvFields" :key="field" :value="field">
                {{ field }}
              </option>
            </select>
          </div>
          <div
            v-if="columnDetections['subcategory']"
            :class="
              getConfidenceColor(columnDetections['subcategory'].confidence)
            "
            class="text-xs pl-1"
          >
            {{
              getConfidenceBadge(columnDetections["subcategory"].confidence)
            }}: {{ columnDetections["subcategory"].reason }}
          </div>
        </div>

        <!-- Notes -->
        <div class="space-y-1">
          <div class="grid grid-cols-2 gap-4 items-center">
            <label
              class="text-sm font-medium text-text-light dark:text-text-dark"
            >
              Notes
            </label>
            <select
              v-model="columnMapping['notes']"
              class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">-- Skip --</option>
              <option v-for="field in csvFields" :key="field" :value="field">
                {{ field }}
              </option>
            </select>
          </div>
          <div
            v-if="columnDetections['notes']"
            :class="getConfidenceColor(columnDetections['notes'].confidence)"
            class="text-xs pl-1"
          >
            {{ getConfidenceBadge(columnDetections["notes"].confidence) }}:
            {{ columnDetections["notes"].reason }}
          </div>
        </div>

        <!-- Tags -->
        <div class="space-y-1">
          <div class="grid grid-cols-2 gap-4 items-center">
            <label
              class="text-sm font-medium text-text-light dark:text-text-dark"
            >
              Tags
            </label>
            <select
              v-model="columnMapping['tags']"
              class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">-- Skip --</option>
              <option v-for="field in csvFields" :key="field" :value="field">
                {{ field }}
              </option>
            </select>
          </div>
          <div
            v-if="columnDetections['tags']"
            :class="getConfidenceColor(columnDetections['tags'].confidence)"
            class="text-xs pl-1"
          >
            {{ getConfidenceBadge(columnDetections["tags"].confidence) }}:
            {{ columnDetections["tags"].reason }}
          </div>
        </div>

        <!-- Note: We removed the Ended At field since end time is computed from timestamp + duration -->

        <!-- Emoji -->
        <div class="space-y-1">
          <div class="grid grid-cols-2 gap-4 items-center">
            <label
              class="text-sm font-medium text-text-light dark:text-text-dark"
            >
              Emoji
            </label>
            <select
              v-model="columnMapping['emoji']"
              class="px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">-- Skip --</option>
              <option v-for="field in csvFields" :key="field" :value="field">
                {{ field }}
              </option>
            </select>
          </div>
          <div
            v-if="columnDetections['emoji']"
            :class="getConfidenceColor(columnDetections['emoji'].confidence)"
            class="text-xs pl-1"
          >
            {{ getConfidenceBadge(columnDetections["emoji"].confidence) }}:
            {{ columnDetections["emoji"].reason }}
          </div>
        </div>
      </div>

      <!-- Configuration -->
      <div class="bg-white dark:bg-cosmic-indigo rounded-lg p-6 space-y-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Data Configuration
        </h3>
        <div>
          <label
            class="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
          >
            Date Format
          </label>
          <input
            v-model="transforms.dateFormat"
            type="text"
            class="w-full px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
            class="w-full px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="e.g., America/New_York"
          />
          <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Detected: {{ Intl.DateTimeFormat().resolvedOptions().timeZone }}
          </p>
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
            class="w-full px-3 py-2 border border-pearl-mist dark:border-cosmic-indigo-light rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
        <div class="flex flex-col items-end gap-2">
          <button
            class="px-6 py-3 bg-mindfulness-light dark:bg-mindfulness-dark text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="
              !columnMapping['timestamp'] || !columnMapping['duration']
            "
            @click="
              generatePreview();
              currentStep++;
            "
          >
            Preview →
          </button>
          <p
            v-if="!columnMapping['timestamp'] || !columnMapping['duration']"
            class="text-xs text-text-light-muted dark:text-text-dark-muted"
          >
            Map "Date/Time" and "Duration" to continue
          </p>
        </div>
      </div>
    </div>

    <!-- Step 3: Preview -->
    <div v-if="currentStep === 3">
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
            <thead class="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th
                  class="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100"
                >
                  Row
                </th>
                <th
                  class="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100"
                >
                  Date/Time
                </th>
                <th
                  class="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100"
                >
                  Duration
                </th>
                <th
                  class="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100"
                >
                  Activity
                </th>
                <th
                  class="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100"
                >
                  Category
                </th>
                <th
                  class="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100"
                >
                  Warnings
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-pearl-mist dark:divide-cosmic-indigo">
              <tr
                v-for="(entry, index) in previewEntries"
                :key="index"
                class="hover:bg-pearl-mist/50 dark:hover:bg-cosmic-black/50"
              >
                <td class="px-4 py-2">{{ index + 1 }}</td>
                <td class="px-4 py-2">{{ entry.timestamp || "—" }}</td>
                <td class="px-4 py-2">{{ entry.duration || "—" }}</td>
                <td class="px-4 py-2">
                  {{ entry.name || entry.subcategory || "—" }}
                </td>
                <td class="px-4 py-2">
                  {{ entry.category }}/{{ entry.subcategory }}
                </td>
                <td class="px-4 py-2">
                  <span
                    v-if="validationWarnings[index]"
                    class="text-xs text-tada-700 dark:text-tada-300"
                  >
                    ⚠️ {{ validationWarnings[index]?.join(", ") }}
                  </span>
                  <span v-else class="text-xs text-gray-500 dark:text-gray-500"
                    >None</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Live Progress -->
      <div v-if="isImporting" class="mt-6 space-y-3">
        <div
          class="flex justify-between text-sm text-text-light-muted dark:text-text-dark-muted"
        >
          <span>{{ progressMessage }}</span>
          <span v-if="importProgress < 100"
            >{{ rowsTotal.toLocaleString() }} entries</span
          >
          <span v-else>Done!</span>
        </div>
        <div
          class="w-full bg-pearl-mist dark:bg-cosmic-indigo-light rounded-full h-2 overflow-hidden"
        >
          <!-- Indeterminate progress animation while waiting for server -->
          <div
            v-if="importProgress < 100"
            class="h-2 rounded-full bg-gradient-to-r from-mindfulness-light via-mindfulness-dark to-mindfulness-light animate-pulse"
            style="width: 100%; animation: shimmer 1.5s ease-in-out infinite"
          ></div>
          <!-- Full bar when complete -->
          <div v-else class="bg-green-500 h-2 rounded-full w-full"></div>
        </div>
        <p
          class="text-xs text-text-light-muted dark:text-text-dark-muted text-center"
        >
          This may take a minute for large imports...
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
          class="px-6 py-3 bg-tada-600 dark:bg-tada-600 text-white rounded-lg hover:opacity-90"
          :disabled="isImporting"
          @click="startImport"
        >
          {{
            isImporting ? "Importing..." : `Import ${csvData.length} Entries`
          }}
        </button>
      </div>
    </div>

    <!-- Step 4: Results -->
    <div v-if="currentStep === 4">
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
          <div class="p-4 bg-tada-600/10 dark:bg-tada-600/10 rounded-lg">
            <div class="text-3xl font-bold text-tada-700 dark:text-tada-300">
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
          <button
            v-if="importResults.errors && importResults.errors.length > 0"
            class="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            @click="downloadErrorLog"
          >
            📥 Download error log
          </button>
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
            @click="handleSaveRecipe"
          >
            {{ isSavingRecipe ? "Saving..." : "Save Recipe" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ImportRecipe, entries } from "~/server/db/schema";
import {
  detectColumnMappings,
  getConfidenceBadge,
  getConfidenceColor,
  type ColumnDetection,
} from "~/utils/columnDetection";

const props = defineProps<{
  recipe: ImportRecipe | null;
}>();

const _emit = defineEmits<{
  complete: [];
  cancel: [];
}>();

const toast = useToast();
const { parseCSVFile, performImport, transformCSVData } = useCSVImport();

// Helper functions for import wizard
async function importCSV(config: {
  csvData: Record<string, string>[];
  columnMapping: Record<string, string>;
  transforms: typeof transforms.value;
  recipe: ImportRecipe | null;
  filename?: string;
}) {
  const transformedEntries = transformCSVData({
    csvData: config.csvData,
    columnMapping: config.columnMapping,
    transforms: config.transforms,
    recipe: config.recipe,
  });

  return performImport({
    entries: transformedEntries,
    source: config.recipe?.name || "csv-import",
    recipeName: config.recipe?.name || "Custom Import",
    recipeId: config.recipe?.id || null,
    filename: config.filename,
  });
}

async function saveRecipe(config: {
  name: string;
  description: string;
  columnMapping: Record<string, string>;
  transforms: typeof transforms.value;
}) {
  await $fetch("/api/import/recipes", {
    method: "POST",
    body: config,
  });

  toast.success(`Recipe "${config.name}" saved successfully`);
  await loadUserRecipes();
}

// Load user recipes on mount
onMounted(() => {
  loadUserRecipes();
});

const currentStep = ref(1);
const totalSteps = 4;

const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File | null>(null);
const csvData = ref<Record<string, string>[]>([]);
const csvFields = ref<string[]>([]);
const parseError = ref<string | null>(null);
const isDragOver = ref(false);

// Column mapping: { fieldName: csvColumnName }
const columnMapping = ref<Record<string, string>>({});
const columnDetections = ref<Record<string, ColumnDetection>>({});

// Transform configuration
const transforms = ref({
  dateFormat: "MM/DD/YYYY HH:mm:ss",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  durationFormat: "H:mm:ss",
  defaultCategory: "mindfulness",
  defaultSubcategory: "",
});

// Preview data
const previewEntries = ref<
  Array<
    Partial<typeof entries.$inferInsert> & {
      warnings?: string[];
      _rowIndex?: number;
      duration?: string;
    }
  >
>([]);
const validationWarnings = ref<Record<number, string[]>>({});

// Import progress
const isImporting = ref(false);
const importProgress = ref(0);
const progressMessage = ref("");
const rowsTotal = ref(0);
const importResults = ref<{
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ message: string; row?: number }>;
} | null>(null);

// Recipe save
const showSaveRecipeDialog = ref(false);
const recipeName = ref("");
const recipeDescription = ref("");
const isSavingRecipe = ref(false);
const userRecipes = ref<
  Array<{
    id: string;
    name: string;
    description: string | null;
    previousVersions?: Array<{
      savedAt: string;
      columnMapping: Record<string, unknown>;
      transforms: Record<string, unknown>;
    }>;
  }>
>([]);
const selectedRecipeId = ref<string | null>(null);
const showVersionHistory = ref(false);
const currentRecipePreviousVersions = ref<
  Array<{
    savedAt: string;
    columnMapping: Record<string, unknown>;
    transforms: Record<string, unknown>;
  }>
>([]);

// Initialize from recipe if provided
watchEffect(() => {
  if (props.recipe) {
    columnMapping.value = props.recipe.columnMapping || {};
    // Load recipe transforms but always use current locale timezone
    const recipeTransforms = props.recipe.transforms || {};
    transforms.value = {
      ...transforms.value,
      ...recipeTransforms,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", // Always use user's current locale
    };
    // Sync dropdown to show the pre-selected recipe
    selectedRecipeId.value = props.recipe.id;
  }
});

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  await processFile(file);
}

function handleFileDrop(event: DragEvent) {
  isDragOver.value = false;
  const file = event.dataTransfer?.files[0];

  if (!file) return;

  if (!file.name.endsWith(".csv")) {
    parseError.value = "Please upload a CSV file";
    return;
  }

  processFile(file);
}

async function processFile(file: File) {
  selectedFile.value = file;
  parseError.value = null;

  const result = await parseCSVFile(file);
  if (result.error || result.data.length === 0) {
    parseError.value = result.error || "No data found in CSV";
    return;
  }

  csvData.value = result.data;
  csvFields.value = result.fields;

  if (!props.recipe) autoDetectMappings();
}

function autoDetectMappings() {
  // Use the new detection utility
  const detections = detectColumnMappings(csvFields.value);

  columnDetections.value = detections;

  // Apply detected mappings
  const mapping: Record<string, string> = {};
  for (const [field, detection] of Object.entries(detections)) {
    mapping[field] = detection.csvColumn;
  }

  columnMapping.value = mapping;
}

function validateEntry(entry: Record<string, unknown>): string[] {
  const warnings: string[] = [];

  // Required fields check
  if (!entry["timestamp"]) {
    warnings.push("Missing date/time");
  }
  if (!entry["duration"]) {
    warnings.push("Missing duration");
  }

  // Validate duration format if present
  if (entry["duration"] && typeof entry["duration"] === "string") {
    const duration = entry["duration"] as string;
    // Allow H:M:S (single digits) or H:MM:SS (double digits) or seconds-only
    if (
      !/^\d+:\d{1,2}:\d{1,2}$/.test(duration) &&
      !/^\d+:\d{1,2}$/.test(duration) &&
      !/^\d+$/.test(duration)
    ) {
      warnings.push("Invalid duration format (expected H:mm:ss or seconds)");
    }
  }

  return warnings;
}

function generatePreview() {
  const preview: Array<
    Partial<typeof entries.$inferInsert> & { warnings?: string[] }
  > = [];
  const warnings: Record<number, string[]> = {};
  const previewCount = Math.min(10, csvData.value.length);

  for (let i = 0; i < previewCount; i++) {
    const row = csvData.value[i];
    if (!row) continue;
    const entry: Record<string, unknown> = { _rowIndex: i };

    Object.entries(columnMapping.value).forEach(([field, csvCol]) => {
      if (csvCol && row[csvCol]) entry[field] = row[csvCol];
    });

    entry["category"] = transforms.value.defaultCategory;
    entry["subcategory"] =
      transforms.value.defaultSubcategory || entry["name"] || "";

    const entryWarnings = validateEntry(entry);
    if (entryWarnings.length > 0) warnings[i] = entryWarnings;

    preview.push(entry);
  }

  previewEntries.value = preview;
  validationWarnings.value = warnings;
}

async function startImport() {
  isImporting.value = true;
  importProgress.value = 0;
  rowsTotal.value = csvData.value.length;
  progressMessage.value = "Sending to server...";

  try {
    const results = await importCSV({
      csvData: csvData.value,
      columnMapping: columnMapping.value,
      transforms: transforms.value,
      recipe: props.recipe,
      filename: selectedFile.value?.name,
    });

    importProgress.value = 100;
    progressMessage.value = "Import complete!";

    importResults.value = results;
    currentStep.value = 4;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Import failed. Please try again.";
    console.error("Import error:", error);
    parseError.value = message;
    toast.error(message);
  } finally {
    isImporting.value = false;
  }
}

async function handleSaveRecipe() {
  isSavingRecipe.value = true;

  try {
    await saveRecipe({
      name: recipeName.value,
      description: recipeDescription.value,
      columnMapping: columnMapping.value,
      transforms: transforms.value,
    });

    toast.success(`Recipe "${recipeName.value}" saved!`);
    showSaveRecipeDialog.value = false;
    recipeName.value = "";
    recipeDescription.value = "";

    // Reload recipes list
    await loadUserRecipes();
  } catch {
    toast.error("Failed to save recipe");
  } finally {
    isSavingRecipe.value = false;
  }
}

async function loadUserRecipes() {
  try {
    const response = await $fetch<{
      success: boolean;
      recipes: Array<{
        id: string;
        name: string;
        description: string | null;
        previousVersions?: Array<{
          savedAt: string;
          columnMapping: Record<string, unknown>;
          transforms: Record<string, unknown>;
        }>;
      }>;
    }>("/api/import/recipes");
    if (response.success) {
      userRecipes.value = response.recipes;
    }
  } catch (error) {
    console.error("Failed to load recipes:", error);
  }
}

async function loadSelectedRecipe() {
  if (!selectedRecipeId.value) {
    showVersionHistory.value = false;
    currentRecipePreviousVersions.value = [];
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe: any = await $fetch(
      `/api/import/recipes/${selectedRecipeId.value}`
    );

    if (recipe.columnMapping) {
      columnMapping.value = recipe.columnMapping;
    }

    if (recipe.transforms) {
      transforms.value = {
        ...transforms.value,
        ...recipe.transforms,
      };
    }

    // Store version history for this recipe
    currentRecipePreviousVersions.value = recipe.previousVersions || [];
    showVersionHistory.value = false;

    toast.success(`Recipe "${recipe.name}" loaded`);
    generatePreview();
  } catch {
    toast.error("Failed to load recipe");
  }
}

async function restoreVersion(versionIndex: number) {
  if (!selectedRecipeId.value) return;

  if (
    !confirm(
      "Restore this previous version? Current configuration will be saved to history."
    )
  )
    return;

  try {
    const response = await $fetch<{ success: boolean; recipe: Record<string, unknown> }>(
      `/api/import/recipes/${selectedRecipeId.value}/restore`,
      {
        method: "POST",
        body: { versionIndex },
      }
    );

    if (response.success && response.recipe) {
      // Update local state with restored recipe
      columnMapping.value = response.recipe.columnMapping;
      transforms.value = {
        ...transforms.value,
        ...response.recipe.transforms,
      };
      currentRecipePreviousVersions.value =
        response.recipe.previousVersions || [];

      toast.success("Version restored successfully");
      generatePreview();
      showVersionHistory.value = false;
    }
  } catch {
    toast.error("Failed to restore version");
  }
}

async function deleteSelectedRecipe() {
  if (!selectedRecipeId.value) return;

  const recipe = userRecipes.value.find((r) => r.id === selectedRecipeId.value);
  if (!recipe) return;

  if (!confirm(`Delete recipe "${recipe.name}"?`)) return;

  try {
    await $fetch(`/api/import/recipes/${selectedRecipeId.value}`, {
      method: "DELETE",
    });

    toast.success(`Recipe "${recipe.name}" deleted`);
    selectedRecipeId.value = null;
    await loadUserRecipes();
  } catch {
    toast.error("Failed to delete recipe");
  }
}

function downloadErrorLog() {
  if (!importResults.value?.errors || importResults.value.errors.length === 0)
    return;

  const csvContent = [
    ["Row", "Error Message"],
    ...importResults.value.errors.map((err) => [
      err.row?.toString() || "Unknown",
      err.message.replace(/"/g, '""'),
    ]),
  ]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `import-errors-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  toast.info("Error log downloaded");
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
</script>
