<script setup lang="ts">
/**
 * OurmojiCalendar
 *
 * Compact history grid of past Ourmoji entries. Click an entry to
 * surface its full reflection in the detail panel below.
 */

import type { OurmojiDailyCardDTO } from "~/types/ourmoji";
import OurmojiDailyCard from "./OurmojiDailyCard.vue";

interface Props {
  entries: OurmojiDailyCardDTO[];
}

const props = defineProps<Props>();

const selected = ref<OurmojiDailyCardDTO | null>(null);

watchEffect(() => {
  if (!selected.value && props.entries.length > 0) {
    selected.value = props.entries[0] ?? null;
  }
});

function select(entry: OurmojiDailyCardDTO) {
  selected.value = entry;
}
</script>

<template>
  <section class="space-y-4">
    <header>
      <h2 class="text-sm font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
        History
      </h2>
    </header>

    <div v-if="entries.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
      No previous Ourmoji yet.
    </div>

    <div v-else>
      <ul
        class="grid grid-cols-7 gap-2 sm:grid-cols-10 md:grid-cols-14"
        role="list"
      >
        <li v-for="entry in entries" :key="entry.id">
          <button
            type="button"
            class="flex aspect-square w-full items-center justify-center rounded-lg border text-2xl transition hover:scale-105"
            :class="
              selected?.id === entry.id
                ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40'
                : 'border-gray-200 bg-white hover:border-purple-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-purple-700'
            "
            :aria-label="`Ourmoji for ${entry.date}: ${entry.emoji}`"
            @click="select(entry)"
          >
            {{ entry.emoji }}
          </button>
        </li>
      </ul>

      <div v-if="selected" class="mt-6">
        <OurmojiDailyCard :entry="selected" :title="selected.date" />
      </div>
    </div>
  </section>
</template>
