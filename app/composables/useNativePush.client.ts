/**
 * Native push notification registration via @capacitor/push-notifications (FCM).
 * Only runs on Capacitor native (Android / iOS). No-op on web.
 *
 * Usage: call subscribe() when the user enables push in settings,
 *        call unsubscribe() when they disable it.
 */

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export function useNativePush() {
  const isNative = Capacitor.isNativePlatform();

  const isSupported = isNative;
  const isSubscribed = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentToken = ref<string | null>(null);

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

    try {
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") {
        error.value = "Notification permission denied";
        return;
      }

      await PushNotifications.register();

      // The token arrives asynchronously via the "registration" event.
      // We set up a one-shot listener and wait for it (or timeout).
      const token = await new Promise<string | null>((resolve) => {
        const timeout = setTimeout(() => resolve(null), 10_000);

        void PushNotifications.addListener("registration", (t) => {
          clearTimeout(timeout);
          resolve(t.value);
        });

        void PushNotifications.addListener("registrationError", () => {
          clearTimeout(timeout);
          resolve(null);
        });
      });

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

      localStorage.removeItem("fcm-token");
      currentToken.value = null;
      isSubscribed.value = false;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : "Failed to disable push notifications";
    } finally {
      isLoading.value = false;
    }
  }

  return { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
