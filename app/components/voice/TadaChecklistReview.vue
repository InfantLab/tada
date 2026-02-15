<script setup lang="ts">
/**
 * TadaChecklistReview Component
 * Displays extracted tadas as a checklist for user review
 * @component voice/TadaChecklistReview
 */

import type { ExtractedTada, TadaSignificance } from "~/types/extraction";
import { CATEGORY_DEFAULTS } from "~/utils/categoryDefaults";

interface Props {
  /** List of extracted tadas */
  tadas: ExtractedTada[];
  /** Original transcription text */
  transcription?: string;
  /** Whether we're in loading/saving state */
  loading?: boolean;
  /** Journal fallback text if no tadas found */
  journalFallback?: string;
  /** Provider that performed extraction */
  provider?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  transcription: "",
  journalFallback: undefined,
  provider: undefined,
});

const emit = defineEmits<{
  /** User confirms selected tadas */
  save: [selected: ExtractedTada[]];
  /** User wants to save as journal instead */
  saveAsJournal: [text: string];
  /** User cancels */
  cancel: [];
  /** User wants to re-record */
  reRecord: [];
  /** User updates tadas (sends full array) */
  update: [tadas: ExtractedTada[]];
}>();

// Local state for tadas (to track selection)
const localTadas = ref<ExtractedTada[]>([]);
const expandedTadaId = ref<string | null>(null);
const showAll = ref(false);

// Initialize local tadas from props
watch(
  () => props.tadas,
  (newTadas) => {
    localTadas.value = newTadas.map((t) => ({ ...t }));
  },
  { immediate: true },
);

// Computed
const selectedCount = computed(
  () => localTadas.value.filter((t) => t.selected).length,
);

const allSelected = computed(
  () =>
    localTadas.value.length > 0 && localTadas.value.every((t) => t.selected),
);

const noneSelected = computed(() => localTadas.value.every((t) => !t.selected));

const hasManyTadas = computed(() => localTadas.value.length > 5);

const visibleTadas = computed(() => {
  if (showAll.value || !hasManyTadas.value) {
    return localTadas.value;
  }
  return localTadas.value.slice(0, 5);
});

const hiddenCount = computed(() =>
  hasManyTadas.value && !showAll.value ? localTadas.value.length - 5 : 0,
);

// Methods
function toggleAll(): void {
  const newValue = !allSelected.value;
  localTadas.value.forEach((t) => {
    t.selected = newValue;
  });
}

function toggleTada(id: string): void {
  const tada = localTadas.value.find((t) => t.id === id);
  if (tada) {
    tada.selected = !tada.selected;
  }
}

function expandTada(id: string): void {
  expandedTadaId.value = expandedTadaId.value === id ? null : id;
}

function updateTada(id: string, updates: Partial<ExtractedTada>): void {
  const index = localTadas.value.findIndex((t) => t.id === id);
  if (index !== -1) {
    Object.assign(localTadas.value[index], updates);
    // Emit full updated array
    emit("update", [...localTadas.value]);
  }
}

function handleSave(): void {
  const selected = localTadas.value.filter((t) => t.selected);
  emit("save", selected);
}

function handleSaveAsJournal(): void {
  const text =
    props.journalFallback ||
    localTadas.value.map((t) => t.originalText || t.title).join(". ");
  emit("saveAsJournal", text);
}

// Significance display
function getSignificanceLabel(sig: TadaSignificance): string {
  switch (sig) {
    case "major":
      return "🌟 Major";
    case "minor":
      return "Quick";
    default:
      return "";
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-green-600";
  if (confidence >= 0.6) return "text-amber-600";
  return "text-red-600";
}

// Get category options from defaults
const categoryOptions = computed(() => {
  return Object.entries(CATEGORY_DEFAULTS).map(([slug, cat]) => ({
    value: slug,
    label: cat.label,
    emoji: cat.emoji,
  }));
});

// Get category display label with emoji
function getCategoryDisplay(categorySlug: string): string {
  const category = CATEGORY_DEFAULTS[categorySlug];
  return category ? `${category.emoji} ${category.label}` : categorySlug;
}
</script>

<template>
  <div class="tada-checklist">
    <!-- Header -->
    <div class="tada-checklist__header">
      <h3 class="tada-checklist__title">
        🎯 Found {{ localTadas.length }} tada{{
          localTadas.length !== 1 ? "s" : ""
        }}
      </h3>
      <span v-if="provider" class="tada-checklist__provider">
        via {{ provider }}
      </span>
    </div>

    <!-- No tadas found -->
    <div v-if="localTadas.length === 0" class="tada-checklist__empty">
      <p class="text-gray-600 mb-4">
        No specific accomplishments detected in your recording.
      </p>
      <button
        v-if="journalFallback"
        type="button"
        class="tada-checklist__btn tada-checklist__btn--primary"
        @click="handleSaveAsJournal"
      >
        📝 Save as Journal Entry
      </button>
      <button
        type="button"
        class="tada-checklist__btn tada-checklist__btn--secondary mt-2"
        @click="$emit('reRecord')"
      >
        🎤 Try Again
      </button>
    </div>

    <!-- Tada list -->
    <template v-else>
      <!-- Actions bar -->
      <div class="tada-checklist__actions">
        <button
          type="button"
          class="tada-checklist__toggle-all"
          @click="toggleAll"
        >
          {{ allSelected ? "Deselect All" : "Select All" }}
        </button>
        <span class="tada-checklist__count">
          {{ selectedCount }} selected
        </span>
      </div>

      <!-- List -->
      <ul class="tada-checklist__list">
        <li
          v-for="tada in visibleTadas"
          :key="tada.id"
          class="tada-checklist__item"
          :class="{
            'tada-checklist__item--expanded': expandedTadaId === tada.id,
          }"
        >
          <!-- Main row -->
          <div class="tada-checklist__item-main">
            <!-- Checkbox -->
            <button
              type="button"
              class="tada-checklist__checkbox"
              :class="{ 'tada-checklist__checkbox--checked': tada.selected }"
              :aria-checked="tada.selected"
              role="checkbox"
              @click="toggleTada(tada.id)"
            >
              <svg
                v-if="tada.selected"
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>

                  v-if="tada.category"
                  class="tada-checklist__item-category"
                >
                  {{ getCategoryDisplay(tada.category)
            <div
              class="tada-checklist__item-content"
              @click="expandTada(tada.id)"
            >
              <span class="tada-checklist__item-title">{{ tada.title }}</span>
              <p v-if="tada.notes" class="tada-checklist__item-notes">
                {{
                  tada.notes.length > 80
                    ? tada.notes.slice(0, 77) + "..."
                    : tada.notes
                }}
              </p>
              <div class="tada-checklist__item-meta">
                <span class="tada-checklist__item-category">
                  {{ tada.category }}
                </span>
                <span
                  v-if="tada.significance !== 'normal'"
                  class="tada-checklist__item-significance"
                  :class="`tada-checklist__item-significance--${tada.significance}`"
                >
                  {{ getSignificanceLabel(tada.significance) }}
                </span>
                <span
                  class="tada-checklist__item-confidence"
                  :class="getConfidenceColor(tada.confidence)"
                >
                  {{ Math.round(tada.confidence * 100) }}%
                </span>
              </div>
            </div>

            <!-- Expand button -->
            <button
              type="button"
              class="tada-checklist__expand"
              :aria-expanded="expandedTadaId === tada.id"
              @click="expandTada(tada.id)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-180': expandedTadaId === tada.id }"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          <!-- Expanded edit form -->
          <div
            v-if="expandedTadaId === tada.id"
            class="tada-checklist__item-edit"
          >
            <label class="tada-checklist__edit-label">
              Title
              <input
                :value="tada.title"
                type="text"
                class="tada-checklist__edit-input"
                @input="
                  (e) =>
                    updateTada(tada.id, {
                      title: (e.target as HTMLInputElement).value,
                    })
                "
              />
            </label>

            <label class="tada-checklist__edit-label">
              Category
              <select
                :value="tada.category"
                class="tada-checklist__edit-select"
                @change="
                  (e) =>
                    updateTada(tada.id, {
                      category: (e.target as HTMLSelectElement).value,
                    })
                  v-for="cat in categoryOptions"
                  :key="cat.value"
                  :value="cat.value"
                >
                  {{ cat.emoji }} {{ cat.label }}
                </option>
                <option value="finance">Finance</option>
                <option value="errands">Errands</option>
                <option value="personal">Personal</option>
              </select>
            </label>

            <label class="tada-checklist__edit-label">
              Notes
              <textarea
                :value="tada.notes || ''"
                class="tada-checklist__edit-input"
                rows="2"
                placeholder="Additional details..."
                @input="
                  (e) =>
                    updateTada(tada.id, {
                      notes:
                        (e.target as HTMLTextAreaElement).value || undefined,
                    })
                "
              />
            </label>

            <label class="tada-checklist__edit-label">
              Significance
              <select
                :value="tada.significance"
                class="tada-checklist__edit-select"
                @change="
                  (e) =>
                    updateTada(tada.id, {
                      significance: (e.target as HTMLSelectElement)
                        .value as TadaSignificance,
                    })
                "
              >
                <option value="minor">Minor (quick task)</option>
                <option value="normal">Normal</option>
                <option value="major">Major (big accomplishment)</option>
              </select>
            </label>

            <p v-if="tada.originalText" class="tada-checklist__original">
              <span class="text-gray-500">Original:</span> "{{
                tada.originalText
              }}"
            </p>
          </div>
        </li>
      </ul>

      <!-- Show more -->
      <button
        v-if="hiddenCount > 0"
        type="button"
        class="tada-checklist__show-more"
        @click="showAll = true"
      >
        Show {{ hiddenCount }} more...
      </button>

      <!-- Journal fallback option -->
      <div v-if="journalFallback" class="tada-checklist__fallback">
        <button
          type="button"
          class="text-indigo-600 hover:text-indigo-800 text-sm"
          @click="handleSaveAsJournal"
        >
          📝 Save as journal entry instead
        </button>
      </div>
    </template>

    <!-- Footer actions -->
    <div class="tada-checklist__footer">
      <button
        type="button"
        class="tada-checklist__btn tada-checklist__btn--ghost"
        :disabled="loading"
        @click="$emit('reRecord')"
      >
        🎤 Re-record
      </button>

      <div class="flex-1" />

      <button
        type="button"
        class="tada-checklist__btn tada-checklist__btn--ghost"
        :disabled="loading"
        @click="$emit('cancel')"
      >
        Cancel
      </button>

      <button
        type="button"
        class="tada-checklist__btn tada-checklist__btn--primary"
        :disabled="noneSelected || loading"
        @click="handleSave"
      >
        <template v-if="loading">
          <span class="animate-spin">⏳</span>
          Saving...
        </template>
        <template v-else>
          ✓ Save {{ selectedCount }} tada{{ selectedCount !== 1 ? "s" : "" }}
        </template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tada-checklist {
  @apply bg-white rounded-2xl shadow-lg p-6 max-w-lg mx-auto;
}

.tada-checklist__header {
  @apply flex items-center justify-between mb-4;
}

.tada-checklist__title {
  @apply text-lg font-semibold text-gray-900;
}

.tada-checklist__provider {
  @apply text-xs text-gray-400;
}

.tada-checklist__empty {
  @apply text-center py-8;
}

.tada-checklist__actions {
  @apply flex items-center justify-between mb-3 pb-3 border-b border-gray-100;
}

.tada-checklist__toggle-all {
  @apply text-sm text-indigo-600 hover:text-indigo-800 font-medium;
}

.tada-checklist__count {
  @apply text-sm text-gray-500;
}

.tada-checklist__list {
  @apply space-y-2;
}

.tada-checklist__item {
  @apply bg-gray-50 rounded-lg overflow-hidden transition-all;
}

.tada-checklist__item--expanded {
  @apply bg-indigo-50 ring-1 ring-indigo-200;
}

.tada-checklist__item-main {
  @apply flex items-center gap-3 p-3;
}

.tada-checklist__checkbox {
  @apply w-6 h-6 rounded border-2 border-gray-300 flex items-center justify-center
         transition-all hover:border-indigo-400;
}

.tada-checklist__checkbox--checked {
  @apply bg-emerald-500 border-emerald-500 text-white;
}

.tada-checklist__item-content {
  @apply flex-1 min-w-0 cursor-pointer;
}

.tada-checklist__item-title {
  @apply block text-gray-900 font-medium truncate;
}

.tada-checklist__item-notes {
  @apply text-xs text-gray-500 mt-0.5 line-clamp-1;
}

.tada-checklist__item-meta {
  @apply flex items-center gap-2 mt-0.5;
}

.tada-checklist__item-category {
  @apply text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded;
}

.tada-checklist__item-significance {
  @apply text-xs font-medium;
}

.tada-checklist__item-significance--major {
  @apply text-amber-600;
}

.tada-checklist__item-significance--minor {
  @apply text-gray-400;
}

.tada-checklist__item-confidence {
  @apply text-xs;
}

.tada-checklist__expand {
  @apply p-1 text-gray-400 hover:text-gray-600;
}

.tada-checklist__item-edit {
  @apply p-3 pt-0 space-y-3;
}

.tada-checklist__edit-label {
  @apply block text-sm text-gray-600;
}

.tada-checklist__edit-input {
  @apply mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg
         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent;
}

.tada-checklist__edit-select {
  @apply mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg
         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent;
}

.tada-checklist__original {
  @apply text-xs text-gray-400 italic;
}

.tada-checklist__show-more {
  @apply w-full mt-2 py-2 text-sm text-indigo-600 hover:text-indigo-800
         font-medium text-center;
}

.tada-checklist__fallback {
  @apply mt-4 pt-4 border-t border-gray-100 text-center;
}

.tada-checklist__footer {
  @apply flex items-center gap-2 mt-6 pt-4 border-t border-gray-100;
}

.tada-checklist__btn {
  @apply px-4 py-2 rounded-lg font-medium transition-all
         disabled:opacity-50 disabled:cursor-not-allowed;
}

.tada-checklist__btn--primary {
  @apply bg-emerald-500 text-white hover:bg-emerald-600;
}

.tada-checklist__btn--secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.tada-checklist__btn--ghost {
  @apply text-gray-600 hover:bg-gray-100;
}
</style>
