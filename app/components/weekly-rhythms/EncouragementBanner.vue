<script setup lang="ts">
interface EncouragementData {
  id: string;
  weekStartDate: string;
  title: string;
  summaryBlocks: Array<{
    section: string;
    heading: string;
    lines: string[];
  }>;
  dismissedAt: string | null;
}

const props = defineProps<{
  encouragement: EncouragementData;
}>();

const emit = defineEmits<{
  dismissed: [];
}>();

const isDismissing = ref(false);

async function dismiss() {
  isDismissing.value = true;
  try {
    await $fetch(
      `/api/weekly-rhythms/messages/${props.encouragement.id}/dismiss`,
      { method: "POST" },
    );
    emit("dismissed");
  } catch (err) {
    console.error("Failed to dismiss encouragement:", err);
  } finally {
    isDismissing.value = false;
  }
}
</script>

<template>
  <div
    class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h3 class="font-medium text-sm text-emerald-800 dark:text-emerald-200">
          {{ encouragement.title }}
        </h3>

        <div class="mt-2 space-y-2">
          <div
            v-for="block in encouragement.summaryBlocks"
            :key="block.section"
          >
            <p class="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {{ block.heading }}
            </p>
            <ul class="mt-1 space-y-0.5">
              <li
                v-for="(line, i) in block.lines"
                :key="i"
                class="text-xs text-emerald-600 dark:text-emerald-400"
              >
                {{ line }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <button
        class="ml-2 text-emerald-400 hover:text-emerald-600 dark:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        :disabled="isDismissing"
        title="Dismiss"
        @click="dismiss"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
