/**
 * Voice Settings Composable
 * Manages user preferences for voice input features
 * @module composables/useVoiceSettings
 */

import type {
  STTProvider,
  LLMProvider,
  VoicePreferences,
  EncryptedKey,
} from "~/types/voice";

/** Default voice preferences */
const DEFAULT_PREFERENCES: VoicePreferences = {
  sttProvider: "auto",
  llmProvider: "auto",
  preferOffline: false,
  hasSeenPrivacyDisclosure: false,
  apiKeys: {},
  voiceEntriesThisMonth: 0,
  voiceEntriesResetDate: undefined,
};

/** Storage key for voice preferences */
const STORAGE_KEY = "tada_voice_preferences";

/**
 * Get the first day of current month as ISO string
 */
function getMonthResetDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * Check if we're in a new month and should reset counter
 */
function shouldResetCounter(resetDate: string | undefined): boolean {
  if (!resetDate) return true;

  const storedMonth = new Date(resetDate).getMonth();
  const currentMonth = new Date().getMonth();

  return storedMonth !== currentMonth;
}

export function useVoiceSettings() {
  // State
  const preferences = ref<VoicePreferences>({ ...DEFAULT_PREFERENCES });
  const isLoaded = ref(false);

  // Individual preference refs for convenience
  const sttProvider = computed({
    get: () => preferences.value.sttProvider,
    set: (value: STTProvider) => {
      preferences.value.sttProvider = value;
      savePreferences();
    },
  });

  const llmProvider = computed({
    get: () => preferences.value.llmProvider,
    set: (value: LLMProvider) => {
      preferences.value.llmProvider = value;
      savePreferences();
    },
  });

  const preferOffline = computed({
    get: () => preferences.value.preferOffline,
    set: (value: boolean) => {
      preferences.value.preferOffline = value;
      savePreferences();
    },
  });

  const hasSeenPrivacyDisclosure = computed({
    get: () => preferences.value.hasSeenPrivacyDisclosure,
    set: (value: boolean) => {
      preferences.value.hasSeenPrivacyDisclosure = value;
      savePreferences();
    },
  });

  const voiceEntriesThisMonth = computed(
    () => preferences.value.voiceEntriesThisMonth || 0,
  );

  /**
   * Load preferences from localStorage
   */
  function loadPreferences(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<VoicePreferences>;

        // Check if we need to reset monthly counter
        if (shouldResetCounter(parsed.voiceEntriesResetDate)) {
          parsed.voiceEntriesThisMonth = 0;
          parsed.voiceEntriesResetDate = getMonthResetDate();
        }

        preferences.value = { ...DEFAULT_PREFERENCES, ...parsed };
      }
      isLoaded.value = true;
    } catch (e) {
      console.warn("Failed to load voice preferences:", e);
      preferences.value = { ...DEFAULT_PREFERENCES };
      isLoaded.value = true;
    }
  }

  /**
   * Save preferences to localStorage
   */
  function savePreferences(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences.value));
    } catch (e) {
      console.warn("Failed to save voice preferences:", e);
    }
  }

  /**
   * Check if a provider API key is configured
   */
  function hasApiKey(
    provider: "openai" | "anthropic" | "groq" | "deepgram",
  ): boolean {
    return Boolean(preferences.value.apiKeys?.[provider]);
  }

  /**
   * Store an encrypted API key
   */
  function setApiKey(
    provider: "openai" | "anthropic" | "groq" | "deepgram",
    encryptedKey: EncryptedKey,
  ): void {
    if (!preferences.value.apiKeys) {
      preferences.value.apiKeys = {};
    }
    preferences.value.apiKeys[provider] = encryptedKey;
    savePreferences();
  }

  /**
   * Remove an API key
   */
  function removeApiKey(
    provider: "openai" | "anthropic" | "groq" | "deepgram",
  ): void {
    if (preferences.value.apiKeys) {
      const { [provider]: _, ...rest } = preferences.value.apiKeys;
      preferences.value.apiKeys = rest;
      savePreferences();
    }
  }

  /**
   * Get encrypted API key for a provider
   */
  function getApiKey(
    provider: "openai" | "anthropic" | "groq" | "deepgram",
  ): EncryptedKey | undefined {
    return preferences.value.apiKeys?.[provider];
  }

  /**
   * Increment monthly voice entry counter
   */
  function incrementVoiceEntryCount(): void {
    // Reset if new month
    if (shouldResetCounter(preferences.value.voiceEntriesResetDate)) {
      preferences.value.voiceEntriesThisMonth = 0;
      preferences.value.voiceEntriesResetDate = getMonthResetDate();
    }

    preferences.value.voiceEntriesThisMonth =
      (preferences.value.voiceEntriesThisMonth || 0) + 1;
    savePreferences();
  }

  /**
   * Check if user has exceeded free tier limit
   */
  function hasExceededFreeLimit(): boolean {
    const config = useRuntimeConfig();
    const publicConfig =
      (config as unknown as { public?: Record<string, unknown> }).public ?? {};
    const limit = (publicConfig["voiceFreeLimit"] as number) || 50;
    return voiceEntriesThisMonth.value >= limit;
  }

  /**
   * Get remaining free entries this month
   */
  function getRemainingFreeEntries(): number {
    const config = useRuntimeConfig();
    const publicConfig =
      (config as unknown as { public?: Record<string, unknown> }).public ?? {};
    const limit = (publicConfig["voiceFreeLimit"] as number) || 50;
    return Math.max(0, limit - voiceEntriesThisMonth.value);
  }

  /**
   * Mark privacy disclosure as seen
   */
  function markPrivacyDisclosureSeen(): void {
    hasSeenPrivacyDisclosure.value = true;
  }

  /**
   * Reset all preferences to defaults
   */
  function resetPreferences(): void {
    preferences.value = { ...DEFAULT_PREFERENCES };
    savePreferences();
  }

  // Auto-load on mount (client-side only)
  if (import.meta.client) {
    loadPreferences();
  }

  return {
    // State
    preferences: readonly(preferences),
    isLoaded: readonly(isLoaded),

    // Individual preferences
    sttProvider,
    llmProvider,
    preferOffline,
    hasSeenPrivacyDisclosure,
    voiceEntriesThisMonth,

    // Actions
    loadPreferences,
    savePreferences,
    hasApiKey,
    setApiKey,
    removeApiKey,
    getApiKey,
    incrementVoiceEntryCount,
    incrementUsage: incrementVoiceEntryCount, // Alias for useTranscription
    hasExceededFreeLimit,
    getRemainingFreeEntries,
    markPrivacyDisclosureSeen,
    resetPreferences,
  };
}
