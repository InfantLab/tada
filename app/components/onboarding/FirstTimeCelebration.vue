<script setup lang="ts">
/**
 * First Time Celebration
 *
 * A gentle celebration when users complete their first action.
 * Philosophy: celebrate the user, not the feature.
 *
 * Shows briefly and fades away - not a modal to dismiss.
 */

const props = defineProps<{
  type: "session" | "tada" | "moment";
}>();

const messages = {
  session: {
    emoji: "🧘",
    title: "Your first session!",
    subtitle: "This is now part of your collection.",
  },
  tada: {
    emoji: "⚡",
    title: "Your first ta-da!",
    subtitle: "Every win deserves to be noticed.",
  },
  moment: {
    emoji: "💭",
    title: "Your first moment!",
    subtitle: "These reflections are treasures.",
  },
};

const message = computed(() => messages[props.type]);
const isVisible = ref(true);

// Auto-hide after a few seconds
onMounted(() => {
  setTimeout(() => {
    isVisible.value = false;
  }, 4000);
});
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-500 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-500 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isVisible"
      class="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-center pointer-events-none"
    >
      <div class="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl px-8 py-6 border border-tada-200 dark:border-tada-800">
        <div class="text-5xl mb-3 animate-bounce">{{ message.emoji }}</div>
        <h3 class="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-1">
          {{ message.title }}
        </h3>
        <p class="text-sm text-stone-600 dark:text-stone-400">
          {{ message.subtitle }}
        </p>
      </div>
    </div>
  </Transition>
</template>
