/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Precache all assets injected by the build
precacheAndRoute(self.__WB_MANIFEST);

// ─── Caching strategies ─────────────────────────────────────────────────────

// API requests — always network, never cache
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkOnly(),
);

// Audio files — cache-first, 30 days, max 20 entries
registerRoute(
  ({ url }) => /\.(mp3|wav|ogg|m4a)$/.test(url.pathname),
  new CacheFirst({
    cacheName: "audio-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
);

// Navigation requests — NetworkFirst with 10-second timeout
// Falls back to the precached /offline.html when offline
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "pages-cache",
      networkTimeoutSeconds: 10,
    }),
    {
      denylist: [/^\/api\//],
    },
  ),
);

// ─── Push events ─────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  const data = event.data?.json() as {
    title?: string;
    body?: string;
    data?: { url?: string };
  } ?? {};

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Ta-Da!", {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.data?.url ?? "/rhythms" },
      tag: "weekly-rhythm",
      renotify: false,
    }),
  );
});

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const url =
          (event.notification.data as { url?: string } | undefined)?.url ??
          "/rhythms";

        for (const client of clientList) {
          if (
            client.url.includes(self.location.origin) &&
            "focus" in client
          ) {
            client.focus();
            (client as WindowClient).navigate(url);
            return;
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
