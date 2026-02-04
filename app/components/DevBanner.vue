<script setup lang="ts">
/**
 * Development environment banner
 * Shows a warning when user is on the dev/staging site
 * Links to production (tada.living)
 */

const isDev = computed(() => {
  // Check APP_URL env var - if it's not tada.living, show banner
  const appUrl = useRuntimeConfig().public.appUrl || '';
  return !appUrl.includes('tada.living');
});

const dismissed = ref(false);

function dismiss() {
  dismissed.value = true;
  // Remember dismissal for this session only
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('devBannerDismissed', 'true');
  }
}

onMounted(() => {
  if (typeof sessionStorage !== 'undefined') {
    dismissed.value = sessionStorage.getItem('devBannerDismissed') === 'true';
  }
});
</script>

<template>
  <div
    v-if="isDev && !dismissed"
    class="bg-amber-100 dark:bg-amber-900/50 border-b border-amber-300 dark:border-amber-700"
  >
    <div class="max-w-7xl mx-auto px-4 py-2">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-sm">
          <span class="text-amber-800 dark:text-amber-200">
            ⚠️ <strong>Development Site</strong> — Your data here is separate from production.
          </span>
          <a
            href="https://tada.living"
            class="text-amber-900 dark:text-amber-100 underline hover:no-underline font-medium"
          >
            Go to tada.living →
          </a>
        </div>
        <button
          class="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 px-2"
          @click="dismiss"
          title="Dismiss for this session"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>
