<script setup lang="ts">
import { useTimelinePosition } from "~/composables/useTimelinePosition";
import { useTimelineStyle } from "~/composables/useTimelineStyle";

interface EntryData {
  id: string;
  type: string;
  timestamp: string;
  durationSeconds?: number | null;
  category?: string | null;
  subcategory?: string | null;
  emoji?: string | null;
}

interface Props {
  entries: EntryData[];
  rangeStart: Date;
  rangeEnd: Date;
}

const props = defineProps<Props>();

const { timelineStyle, toggleTimelineStyle } = useTimelineStyle();

const timelineEntries = computed(() => {
  const { toTimelineEntry, applyJitter } = useTimelinePosition(props.rangeStart, props.rangeEnd);
  const entries = props.entries.map((entry) => toTimelineEntry(entry));
  return applyJitter(entries);
});

const bars = computed(() => timelineEntries.value.filter((e) => !e.isDot));
const dots = computed(() => timelineEntries.value.filter((e) => e.isDot));
</script>

<template>
  <div class="relative group my-2">
    <!-- Toggle button -->
    <button
      class="absolute -right-1 -top-1 z-20 w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-700 border border-stone-300 dark:border-stone-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none"
      :title="timelineStyle === 'minimal' ? 'Switch to beautiful view' : 'Switch to minimal view'"
      @click.stop="toggleTimelineStyle()"
    >
      {{ timelineStyle === 'minimal' ? '✨' : '—' }}
    </button>

    <!-- Minimal style -->
    <div v-if="timelineStyle === 'minimal'" class="relative w-full h-3">
      <!-- Baseline -->
      <div
        class="absolute inset-0 rounded-full bg-stone-200 dark:bg-stone-600 opacity-40"
      />

      <!-- Timed entry bars -->
      <div
        v-for="entry in bars"
        :key="entry.id"
        class="absolute top-0 h-full rounded-full"
        :style="{
          left: entry.positionPercent + '%',
          width: entry.widthPercent + '%',
          backgroundColor: entry.color,
          opacity: 0.7,
        }"
      />

      <!-- Instant entry dots -->
      <div
        v-for="entry in dots"
        :key="entry.id"
        class="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
        :style="{
          left: entry.positionPercent + '%',
          backgroundColor: entry.color,
        }"
      />
    </div>

    <!-- Beautiful style -->
    <div v-else class="relative w-full h-8">
      <!-- Baseline -->
      <div
        class="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 rounded-full bg-stone-200 dark:bg-stone-600 opacity-30"
      />

      <!-- Timed entries: colored bar (z-10) -->
      <div
        v-for="entry in bars"
        :key="entry.id"
        class="absolute top-1/2 -translate-y-1/2 h-2 rounded-full z-10"
        :style="{
          left: entry.positionPercent + '%',
          width: entry.widthPercent + '%',
          backgroundColor: entry.color,
          opacity: 0.35,
        }"
      />

      <!-- Timed entries: emoji at start of interval (z-20, above bar) -->
      <span
        v-for="entry in bars"
        :key="'icon-' + entry.id"
        class="absolute top-1/2 -translate-x-1/2 text-lg leading-none select-none drop-shadow-sm z-20"
        :style="{
          left: (entry.positionPercent + entry.jitterXPct) + '%',
          transform: `translateX(-50%) translateY(calc(-50% + ${entry.jitterYPx}px))`,
        }"
        :title="entry.type"
      >{{ entry.emoji }}</span>

      <!-- Instant entries: emoji only (z-20) -->
      <span
        v-for="entry in dots"
        :key="entry.id"
        class="absolute top-1/2 -translate-x-1/2 text-lg leading-none select-none drop-shadow-sm z-20"
        :style="{
          left: (entry.positionPercent + entry.jitterXPct) + '%',
          transform: `translateX(-50%) translateY(calc(-50% + ${entry.jitterYPx}px))`,
        }"
        :title="entry.type"
      >{{ entry.emoji }}</span>
    </div>
  </div>
</template>
