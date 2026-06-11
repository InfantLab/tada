/**
 * Session bell scheduling.
 *
 * On Capacitor (native Android/iOS): uses @capacitor/local-notifications.
 * OS-level scheduled notifications fire reliably even when the screen is
 * locked or the app is backgrounded — service worker setTimeout does not.
 *
 * On web / PWA: falls back to the service worker SCHEDULE_BELLS approach.
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export type SessionBell = {
  atMs: number;
  kind: "start" | "interval" | "completion";
  soundUrl: string;
  label: string;
};

// Stable numeric ID for one bell in a session. LocalNotifications requires
// integer IDs; we derive them from a hash so we can reconstruct them for
// cancellation without needing to store state across app restarts.
function bellId(sessionId: string, index: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < sessionId.length; i++) {
    h ^= sessionId.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  // Leave bottom 2 digits for index (max 99 bells per session)
  return ((h % 1_000_000) * 100 + (index % 100)) >>> 0;
}

// Extract the res/raw filename from a soundUrl like "/sounds/bell.mp3" → "bell"
function soundName(soundUrl: string): string | undefined {
  if (!soundUrl) return undefined;
  const file = soundUrl.split("/").pop();
  if (!file) return undefined;
  return file.replace(/\.[^.]+$/, "") || undefined;
}

function bellTitle(bell: SessionBell): string {
  switch (bell.kind) {
    case "completion": return "Session complete";
    case "start": return "Session started";
    default: return bell.label || "Interval bell";
  }
}

export function useSessionNotifications() {
  const isNative = Capacitor.isNativePlatform();

  // In-session cache of scheduled IDs for fast cancellation.
  // (Falls back to getPending scan if this composable instance is fresh.)
  const sessionIds = new Map<string, number[]>();

  // ── Native path ──────────────────────────────────────────────────────────

  async function scheduleNative(sessionId: string, bells: SessionBell[]): Promise<void> {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return;

    await cancelNative(sessionId);

    const now = Date.now();
    const future = bells.filter((b) => b.atMs > now);
    if (!future.length) return;

    const ids: number[] = [];
    await LocalNotifications.schedule({
      notifications: future.map((bell, i) => {
        const id = bellId(sessionId, bells.indexOf(bell));
        ids.push(id);
        return {
          id,
          title: bellTitle(bell),
          body: "",
          schedule: { at: new Date(bell.atMs), allowWhileIdle: true },
          channelId: "tada_bells",
          sound: soundName(bell.soundUrl),
          smallIcon: "ic_stat_icon_config_sample",
          extra: { sessionId, kind: bell.kind },
        };
      }),
    });

    sessionIds.set(sessionId, ids);
  }

  async function cancelNative(sessionId: string): Promise<void> {
    const stored = sessionIds.get(sessionId);
    if (stored?.length) {
      await LocalNotifications.cancel({ notifications: stored.map((id) => ({ id })) }).catch(() => {});
      sessionIds.delete(sessionId);
      return;
    }
    // Fallback: scan pending notifications for this session
    try {
      const { notifications } = await LocalNotifications.getPending();
      const matching = notifications.filter((n) => {
        const extra = n.extra as Record<string, unknown> | undefined;
        return extra?.["sessionId"] === sessionId;
      });
      if (matching.length) {
        await LocalNotifications.cancel({ notifications: matching.map((n) => ({ id: n.id })) });
      }
    } catch {
      // Ignore — worst case a stale notification fires; not critical
    }
  }

  // ── Service worker path (web / PWA) ──────────────────────────────────────

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

  async function ensureWebPermission(): Promise<boolean> {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    try {
      return (await Notification.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }

  async function scheduleServiceWorker(sessionId: string, bells: SessionBell[]): Promise<void> {
    const reg = await getRegistration();
    const worker = reg?.active ?? reg?.waiting ?? reg?.installing;
    if (!worker) return;
    if (!(await ensureWebPermission())) return;
    worker.postMessage({ type: "SCHEDULE_BELLS", sessionId, bells });
  }

  async function cancelServiceWorker(sessionId: string): Promise<void> {
    const reg = await getRegistration();
    const worker = reg?.active ?? reg?.waiting ?? reg?.installing;
    if (!worker) return;
    worker.postMessage({ type: "CANCEL_BELLS", sessionId });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async function ensurePermission(): Promise<boolean> {
    if (isNative) {
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === "granted";
    }
    return ensureWebPermission();
  }

  async function schedule(sessionId: string, bells: SessionBell[]): Promise<void> {
    if (isNative) {
      await scheduleNative(sessionId, bells);
    } else {
      await scheduleServiceWorker(sessionId, bells);
    }
  }

  async function cancel(sessionId: string): Promise<void> {
    if (isNative) {
      await cancelNative(sessionId);
    } else {
      await cancelServiceWorker(sessionId);
    }
  }

  return { schedule, cancel, ensurePermission };
}
