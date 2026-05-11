/**
 * Session bell scheduling via service worker.
 *
 * Hands the SW a list of bell timestamps so they fire even when the page is
 * suspended (phone locked, tab backgrounded). The SW only rings the
 * notification when no visible client exists — when the page is alive and
 * visible, the page's own timerTick handles bells inline.
 *
 * Phase 1.1 of v0.7.0. See docs/plans/native-android.md.
 */

export type SessionBell = {
  atMs: number;
  kind: "start" | "interval" | "completion";
  soundUrl: string;
  label: string;
};

export function useSessionNotifications() {
  async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return null;
    }
    try {
      return await navigator.serviceWorker.ready;
    } catch {
      return null;
    }
  }

  async function ensurePermission(): Promise<boolean> {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    try {
      const result = await Notification.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }

  async function schedule(
    sessionId: string,
    bells: SessionBell[],
  ): Promise<void> {
    const reg = await getRegistration();
    const worker = reg?.active ?? reg?.waiting ?? reg?.installing;
    if (!worker) return;
    const granted = await ensurePermission();
    if (!granted) return;
    worker.postMessage({ type: "SCHEDULE_BELLS", sessionId, bells });
  }

  async function cancel(sessionId: string): Promise<void> {
    const reg = await getRegistration();
    const worker = reg?.active ?? reg?.waiting ?? reg?.installing;
    if (!worker) return;
    worker.postMessage({ type: "CANCEL_BELLS", sessionId });
  }

  return { schedule, cancel, ensurePermission };
}
