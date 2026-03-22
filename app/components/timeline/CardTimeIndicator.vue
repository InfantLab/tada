<script setup lang="ts">
import { useTimelinePosition } from "~/composables/useTimelinePosition";

interface Props {
  entry: {
    id: string;
    type: string;
    timestamp: string;
    durationSeconds?: number | null;
    category?: string | null;
  };
  rangeStart: Date;
  rangeEnd: Date;
}

const props = defineProps<Props>();

const timelineEntry = computed(() => {
  const { toTimelineEntry } = useTimelinePosition(props.rangeStart, props.rangeEnd);
  return toTimelineEntry(props.entry);
});
</script>

<template>
  <div class="relative w-full h-1.5 mt-2">
    <!-- Baseline: subtle 24-hour line -->
    <div
      class="absolute inset-0 rounded-full bg-stone-200 dark:bg-stone-600 opacity-40"
    />

    <!-- Bar for timed entries -->
    <div
      v-if="!timelineEntry.isDot"
      class="absolute top-0 h-full rounded-full"
      :style="{
        left: timelineEntry.positionPercent + '%',
        width: timelineEntry.widthPercent + '%',
        backgroundColor: timelineEntry.color,
      }"
    />

    <!-- Dot for instant / short entries -->
    <div
      v-else
      class="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
      :style="{
        left: timelineEntry.positionPercent + '%',
        backgroundColor: timelineEntry.color,
      }"
    />
  </div>
</template>
