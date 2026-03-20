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

// Watch settings to sync form
watch(
  () => settings.value,
  (s) => {
    if (!s) return;
    celebrationEnabled.value = s.celebrationEnabled;
    encouragementEnabled.value = s.encouragementEnabled;
    celebrationTier.value = s.celebrationTier;
    emailCelebration.value = s.deliveryChannels.celebration.email;
    emailEncouragement.value = s.deliveryChannels.encouragement.email;
    acknowledgeCloud.value = s.privacy.cloudAcknowledged;
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

async function handleSave() {
  const result = await saveSettings({
    celebrationEnabled: celebrationEnabled.value,
    encouragementEnabled: encouragementEnabled.value,
    celebrationTier: celebrationTier.value,
    deliveryChannels: {
      celebration: {
        inApp: true,
        email: emailCelebration.value,
        push: false,
      },
      encouragement: {
        inApp: true,
        email: emailEncouragement.value,
        push: false,
      },
    },
    acknowledgeCloudPrivacy: acknowledgeCloud.value || undefined,
  });

  if (result?.saved) {
    showSuccess("Weekly rhythm settings saved");
  } else if (error.value) {
    showError(error.value);
  }
}
</script>

<template>
  <div>
    <div v-if="loading" class="text-sm text-stone-500 dark:text-stone-400 py-4">
      Loading weekly rhythm settings...
    </div>

    <div v-else class="space-y-4">
      <!-- Celebration toggle -->
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

      <!-- Encouragement toggle -->
      <div class="p-4 flex items-center justify-between">
        <div>
          <div class="font-medium text-sm text-stone-800 dark:text-stone-100">
            Thursday Encouragement
          </div>
          <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            A mid-week check-in with gentle stretch goals
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

      <!-- Tier picker (only when celebrations enabled) -->
      <div v-if="celebrationEnabled" class="p-4">
        <div class="font-medium text-sm text-stone-800 dark:text-stone-100 mb-2">
          Celebration Style
        </div>
        <WeeklyTierPicker
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
        <div class="space-y-2">
          <label
            v-if="celebrationEnabled"
            class="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300"
          >
            <input
              v-model="emailCelebration"
              type="checkbox"
              class="rounded border-stone-300 text-emerald-500 focus:ring-emerald-500"
              :disabled="settings.email.unsubscribed"
            />
            Email celebrations
          </label>
          <label
            v-if="encouragementEnabled"
            class="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300"
          >
            <input
              v-model="emailEncouragement"
              type="checkbox"
              class="rounded border-stone-300 text-emerald-500 focus:ring-emerald-500"
              :disabled="settings.email.unsubscribed"
            />
            Email encouragements
          </label>
        </div>
      </div>

      <!-- Save button -->
      <div class="p-4 pt-0">
        <button
          class="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :disabled="saving || (needsCloudAck && !acknowledgeCloud)"
          @click="handleSave"
        >
          {{ saving ? "Saving..." : "Save Weekly Rhythm Settings" }}
        </button>
      </div>

      <!-- Error message -->
      <div v-if="error" class="p-4 pt-0">
        <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      </div>
    </div>
  </div>
</template>
