<script setup lang="ts">
/**
 * ExperimentRunManager
 *
 * UI for pairing + running Ourmoji experiments. Invite flow: pick a
 * partner by username, propose dates, send. The invitee sees the invite
 * in the "Incoming invitations" section and accepts or declines. On
 * accept, the underlying experiment run is created automatically.
 */

import type { OurmojiExperimentRun } from "~/types/ourmoji";

interface Partner {
  id: string;
  username: string;
}

interface Invite {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUsername: string;
  toUsername: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  runId: string | null;
  createdAt: string;
  respondedAt: string | null;
}

interface InviteForm {
  toUserId: string;
  name: string;
  startDate: string;
  endDate: string;
}

const runs = ref<OurmojiExperimentRun[]>([]);
const partners = ref<Partner[]>([]);
const incoming = ref<Invite[]>([]);
const outgoing = ref<Invite[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const form = reactive<InviteForm>({
  toUserId: "",
  name: "",
  startDate: "",
  endDate: "",
});

async function refresh() {
  loading.value = true;
  error.value = null;
  try {
    const [runsRes, partnersRes, invitesRes] = await Promise.all([
      $fetch<{ runs: OurmojiExperimentRun[] }>("/api/ourmoji/experiments"),
      $fetch<{ partners: Partner[] }>("/api/ourmoji/partners"),
      $fetch<{ incoming: Invite[]; outgoing: Invite[] }>(
        "/api/ourmoji/invites",
      ),
    ]);
    runs.value = runsRes.runs;
    partners.value = partnersRes.partners;
    incoming.value = invitesRes.incoming;
    outgoing.value = invitesRes.outgoing;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "Failed to load data";
  } finally {
    loading.value = false;
  }
}

async function sendInvite() {
  error.value = null;
  if (!form.toUserId) {
    error.value = "Pick a partner";
    return;
  }
  try {
    await $fetch("/api/ourmoji/invites", {
      method: "POST",
      body: {
        toUserId: form.toUserId,
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
      },
    });
    form.toUserId = "";
    form.name = "";
    form.startDate = "";
    form.endDate = "";
    await refresh();
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : "Failed to send invite";
  }
}

async function accept(id: string) {
  error.value = null;
  try {
    await $fetch(`/api/ourmoji/invites/${id}/accept`, { method: "POST" });
    await refresh();
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : "Failed to accept invite";
  }
}

async function decline(id: string) {
  error.value = null;
  try {
    await $fetch(`/api/ourmoji/invites/${id}/decline`, { method: "POST" });
    await refresh();
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : "Failed to decline invite";
  }
}

async function cancel(id: string) {
  error.value = null;
  try {
    await $fetch(`/api/ourmoji/invites/${id}/cancel`, { method: "POST" });
    await refresh();
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : "Failed to cancel invite";
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
    <div v-if="error" class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      {{ error }}
    </div>

    <section v-if="incoming.length > 0" class="space-y-3">
      <h2 class="text-lg font-semibold">Incoming invitations</h2>
      <ul class="divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="inv in incoming" :key="inv.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <div class="font-medium">
              From <span class="font-mono">@{{ inv.fromUsername }}</span> · {{ inv.name }}
            </div>
            <div class="text-xs text-gray-500">
              {{ inv.startDate }} → {{ inv.endDate }} · status: <span class="font-mono">{{ inv.status }}</span>
            </div>
          </div>
          <div v-if="inv.status === 'pending'" class="flex gap-2">
            <button
              type="button"
              class="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              @click="accept(inv.id)"
            >
              Accept
            </button>
            <button
              type="button"
              class="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              @click="decline(inv.id)"
            >
              Decline
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Invite a partner</h2>
      <p v-if="partners.length === 0" class="text-sm text-gray-500">
        No other Ourmoji-enabled users yet. When someone else has Ourmoji
        enabled, you'll be able to pair with them here.
      </p>
      <form v-else class="grid gap-3 sm:grid-cols-2" @submit.prevent="sendInvite">
        <label class="flex flex-col text-sm">
          <span class="mb-1 font-medium">Partner</span>
          <select
            v-model="form.toUserId"
            class="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
            required
          >
            <option value="" disabled>Select a user…</option>
            <option v-for="p in partners" :key="p.id" :value="p.id">
              @{{ p.username }}
            </option>
          </select>
        </label>
        <label class="flex flex-col text-sm">
          <span class="mb-1 font-medium">Experiment name</span>
          <input
            v-model="form.name"
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
            Send invitation
          </button>
        </div>
      </form>
    </section>

    <section v-if="outgoing.length > 0" class="space-y-3">
      <h2 class="text-lg font-semibold">Sent invitations</h2>
      <ul class="divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="inv in outgoing" :key="inv.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <div class="font-medium">
              To <span class="font-mono">@{{ inv.toUsername }}</span> · {{ inv.name }}
            </div>
            <div class="text-xs text-gray-500">
              {{ inv.startDate }} → {{ inv.endDate }} · status: <span class="font-mono">{{ inv.status }}</span>
            </div>
          </div>
          <div v-if="inv.status === 'pending'" class="flex gap-2">
            <button
              type="button"
              class="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              @click="cancel(inv.id)"
            >
              Cancel
            </button>
          </div>
        </li>
      </ul>
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
