<script setup lang="ts">
/**
 * ArchiveNotice Component
 *
 * Displays a notice when viewing entries that are outside the
 * free tier's retention window. Shows count of archived entries
 * and a prompt to upgrade.
 */

interface Props {
  archivedCount: number;
  period?: string; // e.g., "January 2025"
}

const props = defineProps<Props>();

const router = useRouter();

function goToUpgrade() {
  router.push("/account");
}
</script>

<template>
  <div
    class="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl"
  >
    <div class="flex-shrink-0 text-2xl">🔒</div>
    <div class="flex-grow">
      <p class="text-amber-800 dark:text-amber-200">
        <span v-if="period">{{ archivedCount }} entries from {{ period }} are</span>
        <span v-else>{{ archivedCount }} older entries are</span>
        archived.
      </p>
      <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
        Upgrade to Premium to access your full history.
      </p>
    </div>
    <button
      class="flex-shrink-0 px-4 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
      @click="goToUpgrade"
    >
      Upgrade
    </button>
  </div>
</template>
