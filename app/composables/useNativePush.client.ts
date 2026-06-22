/**
 * Native push notification registration via @capacitor/push-notifications (FCM).
 * Only runs on Capacitor native (Android / iOS). No-op on web.
 *
 * Usage: call subscribe() when the user enables push in settings,
 *        call unsubscribe() when they disable it.
 */

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

const isNative = Capacitor.isNativePlatform();

// Module-level singleton state — shared across every call to useNativePush(),
// since the underlying native listeners are global to the WebView and must
// only be attached once (re-attaching on every subscribe() call stacks up
// duplicate listeners that misdeliver events to stale callbacks).
const isSubscribed = ref(false);
const isLoading = ref(false);
const error = ref<string | null>(null);
const currentToken = ref<string | null>(null);

let listenersAttached = false;
// The "registration" event only fires once per actual FCM token generation —
// calling register() again on an already-registered device does not
// reliably refire it. Each in-flight subscribe() call parks its resolver
// here so whichever event fires next (even from a stale call) can settle it.
let pendingResolve: ((token: string | null) => void) | null = null;

function ensureListeners(): void {
  if (!isNative || listenersAttached) return;
  listenersAttached = true;

  void PushNotifications.addListener("registration", (t) => {
    currentToken.value = t.value;
    localStorage.setItem("fcm-token", t.value);
    pendingResolve?.(t.value);
    pendingResolve = null;
  });

  void PushNotifications.addListener("registrationError", () => {
    pendingResolve?.(null);
    pendingResolve = null;
  });
}

export function useNativePush() {
  const isSupported = isNative;

  // Restore persisted token on mount so isSubscribed reflects reality
  onMounted(() => {
    if (!isNative) return;
    const saved = localStorage.getItem("fcm-token");
    if (saved) {
      currentToken.value = saved;
      isSubscribed.value = true;
    }
  });

  async function subscribe(): Promise<void> {
    if (!isNative) return;
    isLoading.value = true;
    error.value = null;
    ensureListeners();

    try {
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") {
        error.value = "Notification permission denied";
        return;
      }

      await PushNotifications.register();

      // Reuse an already-known token instead of waiting on a native
      // "registration" event that may never fire again for this device.
      let token = currentToken.value ?? localStorage.getItem("fcm-token");

      if (!token) {
        token = await new Promise<string | null>((resolve) => {
          const timeout = setTimeout(() => {
            pendingResolve = null;
            resolve(null);
          }, 10_000);

          pendingResolve = (t) => {
            clearTimeout(timeout);
            resolve(t);
          };
        });
      }

      if (!token) {
        error.value = "Failed to obtain FCM token";
        return;
      }

      // Register with server
      await $fetch<{ registered: boolean }>("/api/push/fcm-token", {
        method: "POST",
        body: { token },
      });

      currentToken.value = token;
      localStorage.setItem("fcm-token", token);
      isSubscribed.value = true;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : "Failed to enable push notifications";
    } finally {
      isLoading.value = false;
    }
  }

  async function unsubscribe(): Promise<void> {
    if (!isNative) return;
    isLoading.value = true;
    error.value = null;

    try {
      const token = currentToken.value ?? localStorage.getItem("fcm-token");
      if (token) {
        await $fetch("/api/push/fcm-token", {
          method: "DELETE",
          body: { token },
        }).catch(() => {}); // Best-effort — don't block UI on network failure
      }

      // Keep the token cached — the underlying FCM registration doesn't
      // change just because the user toggled the UI off, and re-subscribing
      // needs it to avoid waiting on a native event that won't refire.
      isSubscribed.value = false;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : "Failed to disable push notifications";
    } finally {
      isLoading.value = false;
    }
  }

  return { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
