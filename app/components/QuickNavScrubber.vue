<script setup lang="ts">
// QuickNavScrubber - Thin time navigation bar with year markers

interface Props {
  years: string[]; // Available years e.g. ['2024', '2025', '2026']
  currentPosition?: number; // 0-100 representing scroll position
}

const props = withDefaults(defineProps<Props>(), {
  currentPosition: 0,
});

const emit = defineEmits<{
  "navigate-to-year": [year: string];
}>();

const scrubberRef = ref<HTMLElement | null>(null);
const hoverLabel = ref("");
const hoverPosition = ref(0);

// Calculate year position on the scrubber
function getYearPosition(index: number): number {
  if (props.years.length <= 1) return 50;
  return (index / (props.years.length - 1)) * 100;
}

// Handle click/tap on scrubber
function handleClick(event: MouseEvent | TouchEvent) {
  if (!scrubberRef.value) return;

  const rect = scrubberRef.value.getBoundingClientRect();
  const clientX =
    event instanceof MouseEvent
      ? event.clientX
      : event.touches[0]?.clientX ?? 0;

  const position = ((clientX - rect.left) / rect.width) * 100;
  const yearIndex = Math.round((position / 100) * (props.years.length - 1));
  const year =
    props.years[Math.max(0, Math.min(yearIndex, props.years.length - 1))];

  if (year) {
    emit("navigate-to-year", year);
  }
}

// Handle hover for label display
function handleMouseMove(event: MouseEvent) {
  if (!scrubberRef.value) return;

  const rect = scrubberRef.value.getBoundingClientRect();
  const position = ((event.clientX - rect.left) / rect.width) * 100;
  hoverPosition.value = Math.max(0, Math.min(100, position));

  const yearIndex = Math.round((position / 100) * (props.years.length - 1));
  const year =
    props.years[Math.max(0, Math.min(yearIndex, props.years.length - 1))];
  hoverLabel.value = year ?? "";
}

function handleMouseLeave() {
  hoverLabel.value = "";
}
</script>

<template>
  <div
    v-if="years.length > 0"
    ref="scrubberRef"
    class="relative h-8 bg-stone-100 dark:bg-stone-800 rounded-full cursor-pointer select-none overflow-hidden"
    @click="handleClick"
    @touchstart.prevent="handleClick"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- Track -->
    <div class="absolute inset-0 flex items-center px-4">
      <div
        class="w-full h-1 bg-stone-200 dark:bg-stone-700 rounded-full relative"
      >
        <!-- Year markers -->
        <div
          v-for="(year, index) in years"
          :key="year"
          class="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-500 transition-all duration-150"
          :class="{
            'bg-tada-500 dark:bg-tada-400 scale-125': hoverLabel === year,
          }"
          :style="{
            left: `${getYearPosition(index)}%`,
            transform: 'translate(-50%, -50%)',
          }"
        />

        <!-- Current position indicator -->
        <div
          class="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-tada-500 shadow-md transition-all duration-300"
          :style="{
            left: `${currentPosition}%`,
            transform: 'translate(-50%, -50%)',
          }"
        />
      </div>
    </div>

    <!-- Year labels -->
    <div
      class="absolute inset-0 flex items-center justify-between px-2 pointer-events-none"
    >
      <span
        v-if="years.length > 0"
        class="text-xs font-medium text-stone-400 dark:text-stone-500"
      >
        {{ years[years.length - 1] }}
      </span>
      <span
        v-if="years.length > 1"
        class="text-xs font-medium text-stone-400 dark:text-stone-500"
      >
        {{ years[0] }}
      </span>
    </div>

    <!-- Hover tooltip -->
    <Transition
      enter-active-class="transition-opacity duration-100"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="hoverLabel"
        class="absolute -top-8 px-2 py-1 bg-stone-800 dark:bg-stone-700 text-white text-xs rounded shadow-lg pointer-events-none"
        :style="{ left: `${hoverPosition}%`, transform: 'translateX(-50%)' }"
      >
        {{ hoverLabel }}
      </div>
    </Transition>
  </div>
</template>
