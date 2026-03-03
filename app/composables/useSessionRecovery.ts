/**
 * Session Recovery Composable
 *
 * Persists timed session state to localStorage so interrupted sessions
 * (navigation, phone calls, crashes) can be recovered on next visit.
 *
 * Draft is saved on session start, updated every 5s and on visibilitychange,
 * cleared on normal completion. Stale drafts (>24h) are auto-discarded.
 */

import {
  CATEGORY_DEFAULTS,
  SUBCATEGORY_DEFAULTS,
} from "~/utils/categoryDefaults";

const STORAGE_KEY = "tada:session-draft";
const MAX_DRAFT_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const PERSIST_INTERVAL_MS = 5_000; // 5 seconds

export interface SessionDraft {
  version: 1;
  sessionStartTime: number;
  elapsedSeconds: number;
  wasPaused: boolean;
  pausedElapsed: number;
  timerMode: "fixed" | "unlimited";
  selectedCategory: string;
  selectedSubcategory: string;
  warmUpSeconds: number;
  practiceUrl: string;
  practiceTitle: string;
  intervals: Array<{
    durationMinutes: number;
    repeats: number;
    bellSound: string;
  }>;
  lastSeenAt: number;
  presetId: string | null;
  presetName: string | null;
}

export function useSessionRecovery() {
  const recoveredDraft = ref<SessionDraft | null>(null);
  const showRecoveryModal = ref(false);

  let periodicInterval: ReturnType<typeof setInterval> | null = null;
  let visibilityHandler: (() => void) | null = null;

  // --- localStorage helpers ---

  function readDraft(): SessionDraft | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.version !== 1) return null;
      return parsed as SessionDraft;
    } catch {
      return null;
    }
  }

  function writeDraft(draft: SessionDraft): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Quota exceeded or private browsing — degrade gracefully
    }
  }

  // --- Public API ---

  function persistDraft(draft: SessionDraft): void {
    writeDraft(draft);
  }

  function updateDraft(elapsedSeconds: number, isPaused: boolean): void {
    const draft = readDraft();
    if (!draft) return;
    draft.elapsedSeconds = elapsedSeconds;
    draft.wasPaused = isPaused;
    draft.lastSeenAt = Date.now();
    writeDraft(draft);
  }

  function clearDraft(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    recoveredDraft.value = null;
    showRecoveryModal.value = false;
  }

  function checkForRecovery(): void {
    const draft = readDraft();
    if (!draft) return;

    // Auto-discard stale drafts
    if (Date.now() - draft.lastSeenAt > MAX_DRAFT_AGE_MS) {
      clearDraft();
      return;
    }

    recoveredDraft.value = draft;
    showRecoveryModal.value = true;
  }

  function startPeriodicUpdates(
    getElapsed: () => number,
    getIsPaused: () => boolean,
  ): void {
    stopPeriodicUpdates();
    periodicInterval = setInterval(() => {
      updateDraft(getElapsed(), getIsPaused());
    }, PERSIST_INTERVAL_MS);
  }

  function stopPeriodicUpdates(): void {
    if (periodicInterval !== null) {
      clearInterval(periodicInterval);
      periodicInterval = null;
    }
  }

  function setupVisibilityHandler(
    getElapsed: () => number,
    getIsPaused: () => boolean,
  ): void {
    teardownVisibilityHandler();
    visibilityHandler = () => {
      if (document.visibilityState === "hidden") {
        updateDraft(getElapsed(), getIsPaused());
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }

  function teardownVisibilityHandler(): void {
    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }
  }

  // --- Computed display helpers ---

  const recoveredDisplayTime = computed(() => {
    if (!recoveredDraft.value) return "0:00";
    const total = recoveredDraft.value.elapsedSeconds;
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const mm = String(mins).padStart(hours > 0 ? 2 : 1, "0");
    const ss = String(secs).padStart(2, "0");
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
  });

  const recoveredDescription = computed(() => {
    if (!recoveredDraft.value) return "";
    const { selectedCategory, selectedSubcategory } = recoveredDraft.value;

    const subcatLabel =
      SUBCATEGORY_DEFAULTS[selectedSubcategory]?.label || selectedSubcategory;
    const catLabel =
      CATEGORY_DEFAULTS[selectedCategory]?.label || selectedCategory;

    return subcatLabel !== catLabel
      ? `${subcatLabel} (${catLabel})`
      : catLabel;
  });

  return {
    recoveredDraft: readonly(recoveredDraft),
    showRecoveryModal,
    recoveredDisplayTime,
    recoveredDescription,
    persistDraft,
    updateDraft,
    clearDraft,
    checkForRecovery,
    startPeriodicUpdates,
    stopPeriodicUpdates,
    setupVisibilityHandler,
    teardownVisibilityHandler,
  };
}
