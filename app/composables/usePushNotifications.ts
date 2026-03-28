/**
 * usePushNotifications — client-side VAPID push subscription management.
 *
 * Handles permission requests, subscribe/unsubscribe, and exposes
 * reactive state for the settings UI.
 */

export function usePushNotifications() {
  const isSupported = computed(
    () =>
      import.meta.client &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window,
  );

  const permissionState = ref<NotificationPermission>("default");
  const isSubscribed = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Initialise state once mounted
  onMounted(async () => {
    if (!isSupported.value) return;
    permissionState.value = Notification.permission;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      isSubscribed.value = !!existing;
    } catch {
      // Service worker not yet active — treat as not subscribed
    }
  });

  async function subscribe(): Promise<void> {
    if (!isSupported.value) return;
    isLoading.value = true;
    error.value = null;
    try {
      const { publicKey } = await $fetch<{ publicKey: string | null }>(
        "/api/push/vapid-key",
      );
      if (!publicKey) {
        error.value = "Push notifications are not configured on this server";
        return;
      }

      const permission = await Notification.requestPermission();
      permissionState.value = permission;
      if (permission !== "granted") {
        error.value = "Notification permission denied";
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      await $fetch("/api/push/subscribe", {
        method: "POST",
        body: {
          endpoint: subscription.endpoint,
          keys: { p256dh: json.keys?.["p256dh"], auth: json.keys?.["auth"] },
          userAgent: navigator.userAgent,
        },
      });

      isSubscribed.value = true;
    } catch (err: unknown) {
      error.value =
        err instanceof Error ? err.message : "Failed to enable push notifications";
    } finally {
      isLoading.value = false;
    }
  }

  async function unsubscribe(): Promise<void> {
    if (!isSupported.value) return;
    isLoading.value = true;
    error.value = null;
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        isSubscribed.value = false;
        return;
      }

      await $fetch("/api/push/subscribe", {
        method: "DELETE",
        body: { endpoint: subscription.endpoint },
      });

      await subscription.unsubscribe();
      isSubscribed.value = false;
    } catch (err: unknown) {
      error.value =
        err instanceof Error ? err.message : "Failed to disable push notifications";
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isSupported,
    permissionState,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
