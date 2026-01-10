<script setup lang="ts">
// Timer page - meditation and timed activity timer

definePageMeta({
  layout: 'default',
})

// Timer state
const timerMode = ref<'countdown' | 'unlimited'>('countdown')
const targetMinutes = ref(10)
const elapsedSeconds = ref(0)
const isRunning = ref(false)
const isPaused = ref(false)
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null)

// Timer presets
const presets = [5, 10, 15, 20, 30, 45, 60]

// Computed display values
const displayTime = computed(() => {
  if (timerMode.value === 'countdown') {
    const remaining = Math.max(0, targetMinutes.value * 60 - elapsedSeconds.value)
    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  } else {
    const mins = Math.floor(elapsedSeconds.value / 60)
    const secs = elapsedSeconds.value % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
})

const progress = computed(() => {
  if (timerMode.value === 'countdown') {
    return (elapsedSeconds.value / (targetMinutes.value * 60)) * 100
  }
  return 0
})

const isComplete = computed(() => {
  return timerMode.value === 'countdown' && elapsedSeconds.value >= targetMinutes.value * 60
})

// Timer controls
function startTimer() {
  isRunning.value = true
  isPaused.value = false
  timerInterval.value = setInterval(() => {
    elapsedSeconds.value++
    
    // Check for completion in countdown mode
    if (timerMode.value === 'countdown' && elapsedSeconds.value >= targetMinutes.value * 60) {
      stopTimer()
      playBell()
    }
  }, 1000)
}

function pauseTimer() {
  isPaused.value = true
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

function resumeTimer() {
  isPaused.value = false
  timerInterval.value = setInterval(() => {
    elapsedSeconds.value++
    
    if (timerMode.value === 'countdown' && elapsedSeconds.value >= targetMinutes.value * 60) {
      stopTimer()
      playBell()
    }
  }, 1000)
}

function stopTimer() {
  isRunning.value = false
  isPaused.value = false
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

function resetTimer() {
  stopTimer()
  elapsedSeconds.value = 0
}

function playBell() {
  // TODO: Play bell sound from /audio/bells/
  console.log('🔔 Bell!')
}

async function saveSession() {
  if (elapsedSeconds.value < 1) return
  
  // TODO: Save to API
  const entry = {
    type: 'timed',
    durationSeconds: elapsedSeconds.value,
    occurredAt: new Date().toISOString(),
    data: {
      mode: timerMode.value,
      targetMinutes: timerMode.value === 'countdown' ? targetMinutes.value : null,
    },
  }
  
  console.log('Saving session:', entry)
  
  // Reset for next session
  resetTimer()
  
  // Navigate to timeline
  navigateTo('/')
}

// Cleanup on unmount
onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})

// Keep screen awake while timer is running
// TODO: Implement wake lock API
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[70vh]">
    <!-- Mode toggle (only when not running) -->
    <div v-if="!isRunning" class="flex gap-2 mb-8">
      <button
        @click="timerMode = 'countdown'"
        class="px-4 py-2 rounded-lg font-medium transition-colors"
        :class="timerMode === 'countdown' 
          ? 'bg-tada-600 text-white' 
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'"
      >
        Countdown
      </button>
      <button
        @click="timerMode = 'unlimited'"
        class="px-4 py-2 rounded-lg font-medium transition-colors"
        :class="timerMode === 'unlimited' 
          ? 'bg-tada-600 text-white' 
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'"
      >
        Unlimited
      </button>
    </div>

    <!-- Duration presets (only for countdown, when not running) -->
    <div v-if="timerMode === 'countdown' && !isRunning" class="flex flex-wrap gap-2 justify-center mb-8">
      <button
        v-for="preset in presets"
        :key="preset"
        @click="targetMinutes = preset"
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="targetMinutes === preset 
          ? 'bg-tada-100 dark:bg-tada-900/50 text-tada-700 dark:text-tada-300' 
          : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'"
      >
        {{ preset }}m
      </button>
    </div>

    <!-- Timer display -->
    <div class="relative mb-8">
      <!-- Progress ring (countdown mode only) -->
      <svg v-if="timerMode === 'countdown'" class="w-64 h-64 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          class="text-stone-200 dark:text-stone-700"
          stroke="currentColor"
          stroke-width="4"
          fill="none"
          r="45"
          cx="50"
          cy="50"
        />
        <circle
          class="text-tada-500 transition-all duration-1000"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          fill="none"
          r="45"
          cx="50"
          cy="50"
          :stroke-dasharray="283"
          :stroke-dashoffset="283 - (progress / 100) * 283"
        />
      </svg>
      
      <!-- Time display -->
      <div 
        class="absolute inset-0 flex flex-col items-center justify-center"
        :class="timerMode === 'unlimited' ? 'static' : ''"
      >
        <span 
          class="font-mono font-light tracking-tight"
          :class="timerMode === 'countdown' ? 'text-5xl' : 'text-7xl text-stone-800 dark:text-stone-100'"
        >
          {{ displayTime }}
        </span>
        <span v-if="timerMode === 'unlimited'" class="text-sm text-stone-500 dark:text-stone-400 mt-2">
          elapsed
        </span>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex gap-4">
      <!-- Not running state -->
      <template v-if="!isRunning">
        <button
          @click="startTimer"
          class="w-20 h-20 rounded-full bg-tada-600 hover:bg-tada-700 text-white flex items-center justify-center shadow-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
      </template>

      <!-- Running state -->
      <template v-else>
        <!-- Pause/Resume -->
        <button
          @click="isPaused ? resumeTimer() : pauseTimer()"
          class="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 flex items-center justify-center shadow transition-colors"
        >
          <svg v-if="!isPaused" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>

        <!-- Stop / Save -->
        <button
          @click="saveSession"
          class="w-20 h-20 rounded-full bg-tada-600 hover:bg-tada-700 text-white flex items-center justify-center shadow-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <!-- Reset -->
        <button
          @click="resetTimer"
          class="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 flex items-center justify-center shadow transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </template>
    </div>

    <!-- Session complete message -->
    <div v-if="isComplete" class="mt-8 text-center">
      <p class="text-lg text-tada-600 dark:text-tada-400 font-medium">
        🎉 Session complete!
      </p>
      <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
        Tap the checkmark to save your session
      </p>
    </div>
  </div>
</template>
