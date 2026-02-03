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
  firstSessionCelebrated: boolean;
  firstTadaCelebrated: boolean;
  firstMomentCelebrated: boolean;
  firstWeekCardDismissed: boolean;
  lastSeenVersion: string;
}

const defaultState: OnboardingState = {
  welcomeDismissed: false,
  timerHintDismissed: false,
  firstSessionCelebrated: false,
  firstTadaCelebrated: false,
  firstMomentCelebrated: false,
  firstWeekCardDismissed: false,
  lastSeenVersion: "",
};

export function useOnboarding() {
  const config = useRuntimeConfig();
  const currentVersion = (config.public as { appVersion?: string }).appVersion || "0.0.0";

  // State loaded from localStorage
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

  // Initialize on mount
  onMounted(() => {
    loadState();
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

  // Computed: Is this a new version the user hasn't seen?
  const hasNewVersion = computed(() => {
    if (!isLoaded.value) return false;
    return state.value.lastSeenVersion !== currentVersion && state.value.welcomeDismissed;
  });

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

  function acknowledgeNewVersion() {
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
    hasNewVersion,
    state: readonly(state),

    // Actions
    dismissWelcome,
    dismissTimerHint,
    celebrateFirstSession,
    celebrateFirstTada,
    celebrateFirstMoment,
    dismissFirstWeekCard,
    acknowledgeNewVersion,
    resetOnboarding,
  };
}
