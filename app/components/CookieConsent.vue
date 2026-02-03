<script setup lang="ts">
/**
 * Cookie Consent Banner
 *
 * Minimal consent banner for EU compliance. Only shows in cloud mode.
 * Uses only essential cookies (session, preferences) - no tracking.
 */

const config = useRuntimeConfig();
const isCloudMode = computed(() => (config.public as { isCloudMode?: boolean }).isCloudMode ?? false);

const showBanner = ref(false);

// Check if consent has been given
onMounted(() => {
  if (!isCloudMode.value) return;

  const consent = localStorage.getItem("tada-cookie-consent");
  if (!consent) {
    // Small delay to avoid flash on page load
    setTimeout(() => {
      showBanner.value = true;
    }, 500);
  }
});

function acceptCookies() {
  localStorage.setItem("tada-cookie-consent", "accepted");
  localStorage.setItem("tada-cookie-consent-date", new Date().toISOString());
  showBanner.value = false;
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="showBanner"
        class="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
      >
        <div
          class="max-w-2xl mx-auto bg-white dark:bg-stone-800 rounded-2xl shadow-lg border border-stone-200 dark:border-stone-700 p-4 md:p-5"
        >
          <div class="flex flex-col md:flex-row md:items-center gap-4">
            <!-- Message -->
            <div class="flex-1">
              <p class="text-sm text-stone-700 dark:text-stone-300">
                Ta-Da! uses only essential cookies to keep you logged in and remember
                your preferences. No tracking, no ads.
                <NuxtLink
                  to="/privacy"
                  class="text-tada-600 hover:text-tada-700 dark:text-tada-400 dark:hover:text-tada-300 underline"
                >
                  Learn more
                </NuxtLink>
              </p>
            </div>

            <!-- Action -->
            <div class="flex-shrink-0">
              <button
                class="w-full md:w-auto px-5 py-2 bg-tada-600 text-white rounded-lg hover:bg-tada-700 transition-colors text-sm font-medium"
                @click="acceptCookies"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
