/**
 * Client composable for weekly rhythm settings CRUD.
 */

import type { CelebrationTier } from "~/types/weekly-rhythms";

interface WeeklyRhythmSettingsResponse {
  celebrationEnabled: boolean;
  encouragementEnabled: boolean;
  celebrationTier: CelebrationTier;
  deliveryChannels: {
    celebration: { inApp: boolean; email: boolean; push: boolean };
    encouragement: { inApp: boolean; email: boolean; push: boolean };
  };
  schedule: {
    encouragementLocalTime: string;
    celebrationGenerateLocalTime: string;
    celebrationDeliverLocalTime: string;
  };
  email: {
    address: string | null;
    configured: boolean;
    unsubscribed: boolean;
    consecutiveFailures: number;
  };
  capabilities: {
    privateAiAvailable: boolean;
    cloudAiAvailable: boolean;
    pushAvailable: boolean;
  };
  privacy: {
    cloudAcknowledged: boolean;
  };
}

interface SaveSettingsInput {
  celebrationEnabled?: boolean;
  encouragementEnabled?: boolean;
  celebrationTier?: CelebrationTier;
  deliveryChannels?: {
    celebration: { inApp: boolean; email: boolean; push: boolean };
    encouragement: { inApp: boolean; email: boolean; push: boolean };
  };
  acknowledgeCloudPrivacy?: boolean;
}

interface SaveSettingsResponse {
  saved: boolean;
  settings: {
    celebrationEnabled: boolean;
    encouragementEnabled: boolean;
    celebrationTier: CelebrationTier;
  };
  warnings: string[];
}

export function useWeeklyRhythms() {
  const settings = ref<WeeklyRhythmSettingsResponse | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  async function fetchSettings() {
    loading.value = true;
    error.value = null;
    try {
      settings.value = await $fetch<WeeklyRhythmSettingsResponse>(
        "/api/weekly-rhythms/settings",
      );
    } catch (err: unknown) {
      error.value = "Failed to load weekly rhythm settings";
      console.error("fetchWeeklyRhythmSettings error:", err);
    } finally {
      loading.value = false;
    }
  }

  async function saveSettings(
    input: SaveSettingsInput,
  ): Promise<SaveSettingsResponse | null> {
    saving.value = true;
    error.value = null;
    try {
      const result = await $fetch<SaveSettingsResponse>(
        "/api/weekly-rhythms/settings",
        {
          method: "PUT",
          body: input,
        },
      );
      // Refresh local state
      await fetchSettings();
      return result;
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { message?: string } }).data?.message ?? "Save failed"
          : "Save failed";
      error.value = message;
      return null;
    } finally {
      saving.value = false;
    }
  }

  return {
    settings: readonly(settings),
    loading: readonly(loading),
    saving: readonly(saving),
    error: readonly(error),
    fetchSettings,
    saveSettings,
  };
}
