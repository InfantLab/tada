<script setup lang="ts">
/**
 * ScreenCarousel - Auto-rotating carousel of mobile app screenshots.
 * Shows phone-framed screenshots cycling on a timer with swipe support.
 */

const screens = [
  { src: '/screens/tada-screen-timeline.png', label: 'Timeline' },
  { src: '/screens/Tada-screen-tada.png', label: 'Ta-Da!' },
  { src: '/screens/tada-screen-moments.png', label: 'Moments' },
  { src: '/screens/tada-screen-timer.png', label: 'Sessions' },
  { src: '/screens/tada-screen-tally.png', label: 'Tally' },
  { src: '/screens/tada-screen-rhythm.png', label: 'Rhythms' },
]

const current = ref(0)
let interval: ReturnType<typeof setInterval> | undefined

function goTo(index: number) {
  current.value = index
  resetInterval()
}

function next() {
  current.value = (current.value + 1) % screens.length
}

function prev() {
  current.value = (current.value - 1 + screens.length) % screens.length
  resetInterval()
}

function resetInterval() {
  if (interval) clearInterval(interval)
  interval = setInterval(next, 4000)
}

onMounted(() => {
  interval = setInterval(next, 4000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

// Swipe support
let touchStartX = 0
function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
}
function onTouchEnd(e: TouchEvent) {
  const diff = touchStartX - e.changedTouches[0].clientX
  if (Math.abs(diff) > 50) {
    if (diff > 0) { next(); resetInterval() }
    else { prev() }
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-6">
    <!-- Phone frame -->
    <div
      class="relative w-[260px] h-[520px] sm:w-[280px] sm:h-[560px] rounded-[2.5rem] border-[6px] border-stone-800 dark:border-stone-600 bg-stone-900 shadow-2xl overflow-hidden"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <!-- Notch -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-stone-800 dark:bg-stone-600 rounded-b-2xl z-10" />

      <!-- Screen images -->
      <Transition name="carousel" mode="out-in">
        <img
          :key="current"
          :src="screens[current].src"
          :alt="screens[current].label + ' screen'"
          class="absolute inset-0 w-full h-full object-cover"
        />
      </Transition>
    </div>

    <!-- Label -->
    <p class="text-lg font-semibold text-stone-700 dark:text-stone-300">
      {{ screens[current].label }}
    </p>

    <!-- Dots + arrows -->
    <div class="flex items-center gap-4">
      <button
        aria-label="Previous screen"
        class="p-1 text-stone-400 hover:text-tada-600 dark:hover:text-tada-400 transition-colors"
        @click="prev"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div class="flex gap-2">
        <button
          v-for="(screen, i) in screens"
          :key="i"
          :aria-label="'Go to ' + screen.label"
          class="w-2.5 h-2.5 rounded-full transition-all duration-300"
          :class="i === current
            ? 'bg-tada-600 dark:bg-tada-400 scale-125'
            : 'bg-stone-300 dark:bg-stone-600 hover:bg-stone-400 dark:hover:bg-stone-500'"
          @click="goTo(i)"
        />
      </div>

      <button
        aria-label="Next screen"
        class="p-1 text-stone-400 hover:text-tada-600 dark:hover:text-tada-400 transition-colors"
        @click="() => { next(); resetInterval() }"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.carousel-enter-active,
.carousel-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.carousel-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.carousel-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
