<script setup lang="ts">
/**
 * Welcome Overlay
 *
 * A gentle, warm welcome for first-time users.
 * Philosophy: like a friend showing you around, not a tutorial.
 *
 * - Only shows for authenticated users
 * - Dismisses with any click or key press
 * - Celebrates the user's presence
 * - Never overwhelming or instructional
 */

const { shouldShowWelcome, dismissWelcome } = useOnboarding();

const isVisible = ref(false);
const isAuthenticated = ref(false);

// Check if user is authenticated before showing
onMounted(async () => {
  try {
    const response = await $fetch<{ user: { id: string } | null }>("/api/auth/session");
    isAuthenticated.value = !!response.user;
  } catch {
    isAuthenticated.value = false;
  }

  // Only show welcome for authenticated users who haven't seen it
  if (isAuthenticated.value && shouldShowWelcome.value) {
    setTimeout(() => {
      isVisible.value = true;
    }, 500);
  }
});

// Dismiss on any interaction
function handleDismiss() {
  isVisible.value = false;
  setTimeout(() => {
    dismissWelcome();
  }, 300);
}

// Dismiss on any key press
function handleKeydown() {
  if (isVisible.value) {
    handleDismiss();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-500 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isVisible"
        class="fixed inset-0 z-[100] flex items-center justify-center p-6"
        @click="handleDismiss"
      >
        <!-- Soft backdrop -->
        <div class="absolute inset-0 bg-gradient-to-b from-tada-900/80 to-stone-900/90 backdrop-blur-sm" />

        <!-- Content -->
        <div class="relative text-center max-w-md">
          <!-- Gentle sparkle -->
          <div class="text-6xl mb-6 animate-pulse">✨</div>

          <!-- Welcome message -->
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">
            Welcome to Ta-Da!
          </h1>

          <p class="text-xl text-tada-200 mb-8 leading-relaxed">
            A place to notice your life.<br />
            <span class="text-tada-300/80">Meditations, moments, and small wins.</span>
          </p>

          <!-- Gentle navigation hints -->
          <div class="flex flex-wrap justify-center gap-4 text-sm text-white/70 mb-8">
            <span class="flex items-center gap-2">
              <span class="text-lg">🧘</span>
              <span>Sessions</span>
            </span>
            <span class="flex items-center gap-2">
              <span class="text-lg">⚡</span>
              <span>Ta-Das</span>
            </span>
            <span class="flex items-center gap-2">
              <span class="text-lg">💭</span>
              <span>Moments</span>
            </span>
          </div>

          <!-- Dismiss hint -->
          <p class="text-sm text-white/50">
            tap anywhere to begin
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
