<script setup lang="ts">
/**
 * Reusable celebration overlay component
 * Shows animated emoji, text, and confetti
 * Automatically plays user's preferred ta-da sound
 */

interface Props {
  show: boolean;
  emoji?: string;
  text?: string;
  soundFile?: string;
  duration?: number; // milliseconds
}

const props = withDefaults(defineProps<Props>(), {
  emoji: "🎉",
  text: "TA-DA!",
  soundFile: "/sounds/tada-f-versionD.mp3",
  duration: 2000,
});

const emit = defineEmits<{
  complete: [];
}>();

// Play sound when shown
watch(
  () => props.show,
  (isShowing) => {
    if (isShowing) {
      playSound();
      // Auto-hide after duration
      setTimeout(() => {
        emit("complete");
      }, props.duration);
    }
  },
);

function playSound() {
  try {
    const audio = new Audio(props.soundFile);
    audio.volume = 0.7;
    audio.play().catch(() => {
      // Audio play failed (user hasn't interacted with page yet)
    });
  } catch {
    // Audio not supported
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="celebration">
      <div v-if="show" class="celebration-overlay" aria-live="polite">
        <div class="celebration-content">
          <span class="celebration-emoji">{{ emoji }}</span>
          <span class="celebration-text">{{ text }}</span>
          <div class="confetti-container">
            <span
              v-for="i in 30"
              :key="i"
              class="confetti"
              :style="{
                '--delay': `${Math.random() * 0.5}s`,
                '--x': `${Math.random() * 100}%`,
                '--rotation': `${Math.random() * 360}deg`,
              }"
            ></span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Celebration Overlay */
.celebration-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    rgba(251, 191, 36, 0.95) 0%,
    rgba(245, 158, 11, 0.95) 100%
  );
  pointer-events: none;
}

.celebration-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  animation: celebrate-bounce 0.6s ease-out;
}

.celebration-emoji {
  font-size: 6rem;
  animation: celebrate-pulse 0.3s ease-out infinite alternate;
}

.celebration-text {
  font-size: 4rem;
  font-weight: 900;
  color: white;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  letter-spacing: 0.15em;
}

/* Confetti Animation */
.confetti-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.confetti {
  position: absolute;
  top: -20px;
  left: var(--x);
  width: 12px;
  height: 12px;
  background: linear-gradient(
    45deg,
    #fbbf24,
    #f59e0b,
    #ef4444,
    #8b5cf6,
    #10b981,
    #3b82f6
  );
  border-radius: 2px;
  animation: confetti-fall 2s ease-out forwards;
  animation-delay: var(--delay);
  transform: rotate(var(--rotation));
}

.confetti:nth-child(odd) {
  background: #fbbf24;
}

.confetti:nth-child(3n) {
  background: #ef4444;
}

.confetti:nth-child(5n) {
  background: #10b981;
}

.confetti:nth-child(7n) {
  background: #3b82f6;
}

/* Animations */
@keyframes celebrate-bounce {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes celebrate-pulse {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.1);
  }
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(var(--rotation));
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(calc(var(--rotation) + 720deg));
    opacity: 0;
  }
}

/* Transition */
.celebration-enter-active {
  animation: celebration-in 0.3s ease-out;
}

.celebration-leave-active {
  animation: celebration-out 0.5s ease-in;
}

@keyframes celebration-in {
  from {
    opacity: 0;
    transform: scale(1.2);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes celebration-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
