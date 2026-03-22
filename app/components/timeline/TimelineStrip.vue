<script setup lang="ts">
import { useTimelinePosition } from "~/composables/useTimelinePosition";

interface EntryData {
  id: string;
  type: string;
  timestamp: string;
  durationSeconds?: number | null;
  category?: string | null;
}

interface Props {
  entries: EntryData[];
  rangeStart: Date;
  rangeEnd: Date;
}

const props = defineProps<Props>();

const timelineEntries = computed(() => {
  const { toTimelineEntry } = useTimelinePosition(props.rangeStart, props.rangeEnd);
  return props.entries.map((entry) => toTimelineEntry(entry));
});

const bars = computed(() => timelineEntries.value.filter((e) => !e.isDot));
const dots = computed(() => timelineEntries.value.filter((e) => e.isDot));
</script>

<template>
  <div class="relative w-full h-3 my-2">
    <!-- Baseline: subtle 24-hour line -->
    <div
      class="absolute inset-0 rounded-full bg-stone-200 dark:bg-stone-600 opacity-40"
    />

    <!-- Timed entry bars (semi-transparent for overlap handling) -->
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

    <!-- Instant entry dots (z-ordered by DOM order — later entries on top) -->
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
</template>
