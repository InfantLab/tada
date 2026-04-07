<script setup lang="ts">
/**
 * ExperimentRunManager
 *
 * Minimal admin UI for Ourmoji experiment runs (US4).
 * Lists existing runs, lets the operator create a new one, and exposes
 * pause/resume controls. Statistics + assignment management land in
 * later phases.
 */

import type { OurmojiExperimentRun } from "~/types/ourmoji";

interface CreateForm {
  name: string;
  startDate: string;
  endDate: string;
  participantUserIds: string; // comma-separated
}

const runs = ref<OurmojiExperimentRun[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const form = reactive<CreateForm>({
  name: "",
  startDate: "",
  endDate: "",
  participantUserIds: "",
});

async function refresh() {
  loading.value = true;
  error.value = null;
  try {
    const res = await $fetch<{ runs: OurmojiExperimentRun[] }>(
      "/api/ourmoji/experiments",
    );
    runs.value = res.runs;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "Failed to load runs";
  } finally {
    loading.value = false;
  }
}

async function createRun() {
  error.value = null;
  try {
    const ids = form.participantUserIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await $fetch("/api/ourmoji/experiments", {
      method: "POST",
      body: {
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        participantUserIds: ids,
      },
    });
    form.name = "";
    form.startDate = "";
    form.endDate = "";
    form.participantUserIds = "";
    await refresh();
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : "Failed to create experiment";
  }
}

async function pause(id: string) {
  await $fetch(`/api/ourmoji/experiments/${id}/pause`, { method: "POST" });
  await refresh();
}

async function resume(id: string) {
  await $fetch(`/api/ourmoji/experiments/${id}/resume`, { method: "POST" });
  await refresh();
}

onMounted(() => {
  void refresh();
});
</script>

<template>
  <div class="space-y-8">
    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Create experiment run</h2>
      <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="createRun">
        <label class="flex flex-col text-sm">
          <span class="mb-1 font-medium">Name</span>
          <input
            v-model="form.name"
            class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
            required
          />
        </label>
        <label class="flex flex-col text-sm">
          <span class="mb-1 font-medium">Participants (user ids, comma-separated)</span>
          <input
            v-model="form.participantUserIds"
            class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
            required
          />
        </label>
        <label class="flex flex-col text-sm">
          <span class="mb-1 font-medium">Start date</span>
          <input
            v-model="form.startDate"
            type="date"
            class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
            required
          />
        </label>
        <label class="flex flex-col text-sm">
          <span class="mb-1 font-medium">End date</span>
          <input
            v-model="form.endDate"
            type="date"
            class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
            required
          />
        </label>
        <div class="sm:col-span-2">
          <button
            type="submit"
            class="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Create run
          </button>
        </div>
      </form>
    </section>

    <section class="space-y-3">
      <header class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Runs</h2>
        <button
          type="button"
          class="text-sm text-purple-600 hover:underline"
          @click="refresh"
        >
          Refresh
        </button>
      </header>

      <div v-if="error" class="text-sm text-red-600">{{ error }}</div>
      <div v-if="loading && runs.length === 0" class="text-sm text-gray-500">
        Loading…
      </div>
      <div v-else-if="runs.length === 0" class="text-sm text-gray-500">
        No experiment runs yet.
      </div>
      <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="run in runs" :key="run.id" class="flex items-center justify-between py-3">
          <div>
            <div class="font-medium">{{ run.name }}</div>
            <div class="text-xs text-gray-500">
              {{ run.startDate }} → {{ run.endDate }} · status:
              <span class="font-mono">{{ run.status }}</span>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              v-if="run.status === 'active'"
              type="button"
              class="rounded-md border border-amber-400 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              @click="pause(run.id)"
            >
              Pause
            </button>
            <button
              v-if="run.status === 'paused'"
              type="button"
              class="rounded-md border border-emerald-400 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              @click="resume(run.id)"
            >
              Resume
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
