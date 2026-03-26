<script setup lang="ts">
/**
 * What's New Overlay
 *
 * Shows once for existing users who upgrade to a new version.
 * Currently highlights the Weekly Celebrations feature (v0.6.0).
 * If user says "Yes", enables both celebrations + encouragement
 * and navigates to settings so they can see the options.
 */

const { hasNewVersion, acknowledgeNewVersion } = useOnboarding();
const router = useRouter();

const isVisible = ref(false);
const isAuthenticated = ref(false);
const enabling = ref(false);

onMounted(async () => {
  try {
    const response = await $fetch<{ user: { id: string } | null }>("/api/auth/session");
    isAuthenticated.value = !!response.user;
  } catch {
    isAuthenticated.value = false;
  }

  if (isAuthenticated.value && hasNewVersion.value) {
    setTimeout(() => {
      isVisible.value = true;
    }, 800);
  }
});

async function handleEnable() {
  enabling.value = true;
  try {
    await $fetch("/api/weekly-rhythms/settings", {
      method: "PUT",
      body: {
        celebrationEnabled: true,
        encouragementEnabled: true,
      },
    });
  } catch {
    // Settings will be off — user can enable manually in settings
  }
  enabling.value = false;
  isVisible.value = false;
  acknowledgeNewVersion();
  await router.push("/settings");
}

function handleDismiss() {
  isVisible.value = false;
  acknowledgeNewVersion();
}
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
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-gradient-to-b from-tada-900/80 to-stone-900/90 backdrop-blur-sm"
          @click="handleDismiss"
        />

        <!-- Content card -->
        <div
          class="relative bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
        >
          <div class="text-4xl mb-4">🎉</div>

          <h2 class="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">
            New in Ta-Da!
          </h2>

          <p class="text-sm text-stone-600 dark:text-stone-300 mb-1">
            <strong>Weekly Celebrations</strong> — get a stats summary every Monday
            to see how your week went.
          </p>
          <p class="text-sm text-stone-600 dark:text-stone-300 mb-5">
            Plus a gentle <strong>mid-week encouragement</strong> on Thursdays.
          </p>

          <p class="text-sm text-stone-500 dark:text-stone-400 mb-5">
            Want to turn them on?
          </p>

          <div class="flex flex-col gap-2">
            <button
              class="w-full py-2.5 px-4 rounded-xl bg-tada-600 hover:bg-tada-700 text-white font-medium text-sm transition-colors disabled:opacity-60"
              :disabled="enabling"
              @click="handleEnable"
            >
              {{ enabling ? "Turning on..." : "Yes, turn it on!" }}
            </button>
            <button
              class="w-full py-2 px-4 rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 text-sm transition-colors"
              @click="handleDismiss"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
