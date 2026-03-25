<script setup lang="ts">
import type { CelebrationTier } from "~/types/weekly-rhythms";

const { settings, loading, saving, error, fetchSettings, saveSettings } =
  useWeeklyRhythms();
const { success: showSuccess, error: showError } = useToast();

// Local form state
const celebrationEnabled = ref(false);
const encouragementEnabled = ref(false);
const celebrationTier = ref<CelebrationTier>("stats_only");
const emailCelebration = ref(false);
const emailEncouragement = ref(false);
const acknowledgeCloud = ref(false);

// Prevent watchers from firing during server-to-local sync
const syncing = ref(false);

// Watch settings to sync form
watch(
  () => settings.value,
  (s) => {
    if (!s) return;
    syncing.value = true;
    celebrationEnabled.value = s.celebrationEnabled;
    encouragementEnabled.value = s.encouragementEnabled;
    celebrationTier.value = s.celebrationTier;
    emailCelebration.value = s.deliveryChannels.celebration.email;
    emailEncouragement.value = s.deliveryChannels.encouragement.email;
    acknowledgeCloud.value = s.privacy.cloudAcknowledged;
    nextTick(() => {
      syncing.value = false;
    });
  },
  { immediate: true },
);

onMounted(() => {
  fetchSettings();
});

const needsCloudAck = computed(() => {
  const isCloud =
    celebrationTier.value === "cloud_factual" ||
    celebrationTier.value === "cloud_creative";
  return isCloud && !settings.value?.privacy.cloudAcknowledged && !acknowledgeCloud.value;
});

// Auto-save helper
async function autoSave(input: Parameters<typeof saveSettings>[0]) {
  const result = await saveSettings(input);
  if (!result?.saved && error.value) {
    showError(error.value);
  }
}

// Per-field watchers for auto-save
watch(encouragementEnabled, (val) => {
  if (syncing.value) return;
  const input: Parameters<typeof saveSettings>[0] = { encouragementEnabled: val };
  // Auto-enable email delivery when opting in
  if (val && settings.value?.email.configured && !settings.value?.email.unsubscribed) {
    emailEncouragement.value = true;
    input.deliveryChannels = {
      celebration: { inApp: true, email: emailCelebration.value, push: false },
      encouragement: { inApp: true, email: true, push: false },
    };
  }
  autoSave(input);
});

watch(celebrationEnabled, (val) => {
  if (syncing.value) return;
  const input: Parameters<typeof saveSettings>[0] = { celebrationEnabled: val };
  // Auto-enable email delivery when opting in
  if (val && settings.value?.email.configured && !settings.value?.email.unsubscribed) {
    emailCelebration.value = true;
    input.deliveryChannels = {
      celebration: { inApp: true, email: true, push: false },
      encouragement: { inApp: true, email: emailEncouragement.value, push: false },
    };
  }
  autoSave(input);
});

watch(celebrationTier, (val) => {
  if (syncing.value) return;
  autoSave({ celebrationTier: val });
});

watch(emailCelebration, (val) => {
  if (syncing.value) return;
  autoSave({
    deliveryChannels: {
      celebration: { inApp: true, email: val, push: false },
      encouragement: { inApp: true, email: emailEncouragement.value, push: false },
    },
  });
});

watch(emailEncouragement, (val) => {
  if (syncing.value) return;
  autoSave({
    deliveryChannels: {
      celebration: { inApp: true, email: emailCelebration.value, push: false },
      encouragement: { inApp: true, email: val, push: false },
    },
  });
});

// Cloud ack: only auto-save when checked (intentional friction)
watch(acknowledgeCloud, (val) => {
  if (syncing.value || !val) return;
  autoSave({ acknowledgeCloudPrivacy: true });
});

// Test email
const sendingTestCelebration = ref(false);
const sendingTestEncouragement = ref(false);

async function sendTestEmail(kind: "celebration" | "encouragement") {
  const sending = kind === "celebration" ? sendingTestCelebration : sendingTestEncouragement;
  sending.value = true;
  try {
    await $fetch("/api/weekly-rhythms/test-email", {
      method: "POST",
      body: { kind },
    });
    const label = kind === "celebration" ? "celebration" : "encouragement";
    showSuccess(`Test ${label} email sent! Check your inbox.`);
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : null;
    showError(message || "Something went wrong sending the test email. Please try again later.");
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div>
    <div v-if="loading" class="text-sm text-stone-500 dark:text-stone-400 py-4 px-4">
      Loading rhythm settings...
    </div>

    <div v-else class="space-y-0">
      <!-- Mid-Week Encouragement toggle -->
      <div class="p-4 flex items-center justify-between">
        <div>
          <div class="font-medium text-sm text-stone-800 dark:text-stone-100">
            Mid-Week Encouragement
          </div>
          <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            A gentle Thursday check-in with stretch goals
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            v-model="encouragementEnabled"
            type="checkbox"
            class="sr-only peer"
          />
          <div
            class="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-stone-600 peer-checked:bg-emerald-500"
          />
        </label>
      </div>

      <!-- Weekly Celebration toggle -->
      <div class="p-4 flex items-center justify-between">
        <div>
          <div class="font-medium text-sm text-stone-800 dark:text-stone-100">
            Weekly Celebration
          </div>
          <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Receive a stats summary every Monday morning
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            v-model="celebrationEnabled"
            type="checkbox"
            class="sr-only peer"
          />
          <div
            class="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-stone-600 peer-checked:bg-emerald-500"
          />
        </label>
      </div>

      <!-- Tier picker (only when celebrations enabled) -->
      <div v-if="celebrationEnabled" class="p-4">
        <div class="font-medium text-sm text-stone-800 dark:text-stone-100 mb-2">
          Celebration Style
        </div>
        <WeeklyRhythmsTierPicker
          v-model="celebrationTier"
          :cloud-ai-available="settings?.capabilities.cloudAiAvailable ?? false"
          :private-ai-available="settings?.capabilities.privateAiAvailable ?? false"
          :cloud-acknowledged="settings?.privacy.cloudAcknowledged ?? false"
        />
      </div>

      <!-- Cloud privacy acknowledgement -->
      <div v-if="needsCloudAck" class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <label class="flex items-start gap-2 cursor-pointer">
          <input
            v-model="acknowledgeCloud"
            type="checkbox"
            class="mt-1 rounded border-stone-300 text-emerald-500 focus:ring-emerald-500"
          />
          <span class="text-xs text-stone-700 dark:text-stone-300">
            I understand that cloud AI tiers send a summary of my weekly statistics
            (entry counts, durations, rhythm status) to a third-party AI provider.
            No raw journal entries, notes, or personal text are shared.
          </span>
        </label>
      </div>

      <!-- Email delivery toggles -->
      <div
        v-if="settings?.email.configured && (celebrationEnabled || encouragementEnabled)"
        class="p-4"
      >
        <div class="font-medium text-sm text-stone-800 dark:text-stone-100 mb-2">
          Email Delivery
        </div>
        <p class="text-xs text-stone-500 dark:text-stone-400 mb-3">
          {{ settings.email.address }}
          <span v-if="settings.email.unsubscribed" class="text-amber-500 ml-1">
            (unsubscribed)
          </span>
        </p>
        <div class="space-y-3">
          <!-- Email celebration toggle -->
          <div
            v-if="celebrationEnabled"
            class="flex items-center justify-between"
          >
            <span class="text-sm text-stone-700 dark:text-stone-300">Email celebrations</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="emailCelebration"
                type="checkbox"
                class="sr-only peer"
                :disabled="settings.email.unsubscribed"
              />
              <div
                class="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-stone-600 peer-checked:bg-emerald-500 peer-disabled:opacity-50"
              />
            </label>
          </div>

          <!-- Email encouragement toggle -->
          <div
            v-if="encouragementEnabled"
            class="flex items-center justify-between"
          >
            <span class="text-sm text-stone-700 dark:text-stone-300">Email encouragements</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="emailEncouragement"
                type="checkbox"
                class="sr-only peer"
                :disabled="settings.email.unsubscribed"
              />
              <div
                class="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-stone-600 peer-checked:bg-emerald-500 peer-disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        <!-- Test email buttons -->
        <div
          v-if="(emailCelebration && celebrationEnabled) || (emailEncouragement && encouragementEnabled)"
          class="mt-3 flex gap-2"
        >
          <button
            v-if="emailCelebration && celebrationEnabled"
            class="text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-50 transition-colors"
            :disabled="sendingTestCelebration"
            @click="sendTestEmail('celebration')"
          >
            {{ sendingTestCelebration ? "Sending..." : "Send Test Celebration" }}
          </button>
          <button
            v-if="emailEncouragement && encouragementEnabled"
            class="text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-50 transition-colors"
            :disabled="sendingTestEncouragement"
            @click="sendTestEmail('encouragement')"
          >
            {{ sendingTestEncouragement ? "Sending..." : "Send Test Encouragement" }}
          </button>
        </div>
      </div>

      <!-- Status indicators -->
      <div v-if="saving" class="px-4 pb-3">
        <p class="text-xs text-stone-400 dark:text-stone-500">Saving...</p>
      </div>
      <div v-if="error" class="px-4 pb-3">
        <p class="text-xs text-red-600 dark:text-red-400">{{ error }}</p>
      </div>
    </div>
  </div>
</template>
