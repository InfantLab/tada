/**
 * Onboarding Composable
 *
 * Manages gentle, celebratory onboarding state.
 * Philosophy: warm welcome like a friend showing you around,
 * never instructional or overwhelming.
 *
 * Features:
 * - Welcome overlay for first-time users
 * - Contextual hints that appear as users explore
 * - Celebrates first actions (first session, first ta-da, etc.)
 * - Respects dismissals - once dismissed, stays dismissed
 */

const STORAGE_KEY = "tada-onboarding";

interface OnboardingState {
  welcomeDismissed: boolean;
  timerHintDismissed: boolean;
  settingsHintDismissed: boolean;
  firstSessionCelebrated: boolean;
  firstTadaCelebrated: boolean;
  firstMomentCelebrated: boolean;
  firstWeekCardDismissed: boolean;
  lastSeenVersion: string;
  /**
   * Announcement ids the user has already dismissed (or acknowledged).
   * Used by WhatsNewOverlay to avoid re-prompting on every patch release.
   */
  dismissedAnnouncements: string[];
}

const defaultState: OnboardingState = {
  welcomeDismissed: false,
  timerHintDismissed: false,
  settingsHintDismissed: false,
  firstSessionCelebrated: false,
  firstTadaCelebrated: false,
  firstMomentCelebrated: false,
  firstWeekCardDismissed: false,
  lastSeenVersion: "",
  dismissedAnnouncements: [],
};

/**
 * Announcement id for the v0.6 "Daily timelines + Weekly Celebrations"
 * overlay. Anyone who has seen any prior version of the app has already
 * been shown this content (repeatedly, because of the old version-based
 * gate) and should not see it again.
 */
const LEGACY_V06_ANNOUNCEMENT_ID = "v0.6-celebrations-timelines";

// Shared singleton state — all callers of useOnboarding() operate on the
// same refs so that a saveState() in one component never overwrites changes
// made by another component.
const state = ref<OnboardingState>({ ...defaultState });
const isLoaded = ref(false);

// Load state from localStorage
function loadState() {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<OnboardingState>;
      state.value = { ...defaultState, ...parsed };

      // Migration: users who already saw a version prior to this fix have
      // been shown the v0.6 announcement on every patch release. Mark it
      // dismissed on load so the modal stops reappearing.
      if (
        parsed.lastSeenVersion &&
        !state.value.dismissedAnnouncements.includes(LEGACY_V06_ANNOUNCEMENT_ID)
      ) {
        state.value.dismissedAnnouncements = [
          ...state.value.dismissedAnnouncements,
          LEGACY_V06_ANNOUNCEMENT_ID,
        ];
        saveState();
      }
    }
  } catch {
    // Ignore parse errors, use defaults
  }
  isLoaded.value = true;
}

// Save state to localStorage
function saveState() {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value));
  } catch {
    // Ignore storage errors
  }
}

export function useOnboarding() {
  const config = useRuntimeConfig();
  const currentVersion = String(config.public?.appVersion ?? "0.0.0");

  // Initialize on mount — safe to call multiple times since all
  // instances share the same state ref
  onMounted(() => {
    if (!isLoaded.value) {
      loadState();
    }
  });

  // Computed: Should show welcome overlay?
  const shouldShowWelcome = computed(() => {
    if (!isLoaded.value) return false;
    return !state.value.welcomeDismissed;
  });

  // Computed: Should show timer hint?
  const shouldShowTimerHint = computed(() => {
    if (!isLoaded.value) return false;
    return !state.value.timerHintDismissed;
  });

  // Computed: Should show settings hint?
  const shouldShowSettingsHint = computed(() => {
    if (!isLoaded.value) return false;
    return !state.value.settingsHintDismissed;
  });

  // Computed: Should show first week getting started card?
  const shouldShowFirstWeekCard = computed(() => {
    if (!isLoaded.value) return false;
    return !state.value.firstWeekCardDismissed;
  });

  function hasSeenAnnouncement(id: string): boolean {
    return state.value.dismissedAnnouncements.includes(id);
  }

  /**
   * Gate for WhatsNewOverlay. Shows only if the announcement has not
   * been dismissed, and the user has completed the initial welcome
   * (so a fresh signup doesn't get hit with two overlays at once).
   */
  function shouldShowAnnouncement(id: string): boolean {
    if (!isLoaded.value) return false;
    if (!state.value.welcomeDismissed) return false;
    return !hasSeenAnnouncement(id);
  }

  // Actions
  function dismissWelcome() {
    state.value.welcomeDismissed = true;
    state.value.lastSeenVersion = currentVersion;
    saveState();
  }

  function dismissTimerHint() {
    state.value.timerHintDismissed = true;
    saveState();
  }

  function dismissSettingsHint() {
    state.value.settingsHintDismissed = true;
    saveState();
  }

  function celebrateFirstSession() {
    if (!state.value.firstSessionCelebrated) {
      state.value.firstSessionCelebrated = true;
      saveState();
      return true; // Return true to indicate this is the first time
    }
    return false;
  }

  function celebrateFirstTada() {
    if (!state.value.firstTadaCelebrated) {
      state.value.firstTadaCelebrated = true;
      saveState();
      return true;
    }
    return false;
  }

  function celebrateFirstMoment() {
    if (!state.value.firstMomentCelebrated) {
      state.value.firstMomentCelebrated = true;
      saveState();
      return true;
    }
    return false;
  }

  function dismissFirstWeekCard() {
    state.value.firstWeekCardDismissed = true;
    saveState();
  }

  function acknowledgeAnnouncement(id: string) {
    if (!state.value.dismissedAnnouncements.includes(id)) {
      state.value.dismissedAnnouncements = [
        ...state.value.dismissedAnnouncements,
        id,
      ];
    }
    state.value.lastSeenVersion = currentVersion;
    saveState();
  }

  // Reset for testing
  function resetOnboarding() {
    state.value = { ...defaultState };
    saveState();
  }

  return {
    // State
    isLoaded,
    shouldShowWelcome,
    shouldShowTimerHint,
    shouldShowSettingsHint,
    shouldShowFirstWeekCard,
    shouldShowAnnouncement,
    hasSeenAnnouncement,
    state: readonly(state),

    // Actions
    dismissWelcome,
    dismissTimerHint,
    dismissSettingsHint,
    celebrateFirstSession,
    celebrateFirstTada,
    celebrateFirstMoment,
    dismissFirstWeekCard,
    acknowledgeAnnouncement,
    resetOnboarding,
  };
}
