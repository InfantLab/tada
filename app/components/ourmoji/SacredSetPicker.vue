<script setup lang="ts">
/**
 * SacredSetPicker (US3, T066, T083)
 *
 * Forced-choice 23-emoji grid for the receiver's guess. Includes
 * a confidence slider (1-5). Includes a label fallback so devices
 * that can't render an emoji glyph still see something meaningful.
 */

import { SACRED_SET } from "~/utils/ourmoji/sacredSet";

interface Props {
  modelValue?: { emoji: string; confidence: number } | null;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: { emoji: string; confidence: number }];
  submit: [value: { emoji: string; confidence: number }];
}>();

const selectedEmoji = ref<string | null>(props.modelValue?.emoji ?? null);
const confidence = ref<number>(props.modelValue?.confidence ?? 3);

function pick(emoji: string) {
  if (props.disabled) return;
  selectedEmoji.value = emoji;
  emit("update:modelValue", { emoji, confidence: confidence.value });
}

function handleSubmit() {
  if (!selectedEmoji.value || props.disabled) return;
  emit("submit", { emoji: selectedEmoji.value, confidence: confidence.value });
}
</script>

<template>
  <section class="space-y-5">
    <header class="space-y-1">
      <h2 class="text-lg font-semibold">Choose an emoji</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Tap the one that resonates with your dream.
      </p>
    </header>

    <ul class="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8" role="radiogroup">
      <li v-for="entry in SACRED_SET" :key="entry.key">
        <button
          type="button"
          role="radio"
          :aria-checked="selectedEmoji === entry.emoji"
          :aria-label="entry.label"
          :disabled="disabled"
          class="flex aspect-square w-full flex-col items-center justify-center rounded-lg border text-3xl transition disabled:opacity-50"
          :class="
            selectedEmoji === entry.emoji
              ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-400'
              : 'border-gray-200 bg-white hover:border-purple-300 dark:border-gray-700 dark:bg-gray-900'
          "
          :title="entry.label"
          @click="pick(entry.emoji)"
        >
          <span aria-hidden="true">{{ entry.emoji }}</span>
          <span class="mt-1 text-[9px] leading-tight text-gray-500 line-clamp-1">
            {{ entry.label.split(" / ")[0] }}
          </span>
        </button>
      </li>
    </ul>

    <div>
      <label class="block text-sm font-medium mb-1">
        Confidence: <span class="font-mono">{{ confidence }}</span> / 5
      </label>
      <input
        v-model.number="confidence"
        type="range"
        min="1"
        max="5"
        step="1"
        class="w-full"
        :disabled="disabled"
      />
    </div>

    <div class="flex justify-end">
      <button
        type="button"
        :disabled="disabled || !selectedEmoji"
        class="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-purple-700"
        @click="handleSubmit"
      >
        Submit guess
      </button>
    </div>
  </section>
</template>
