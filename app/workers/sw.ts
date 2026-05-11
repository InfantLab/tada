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

// ─── Session bell scheduling ──────────────────────────────────────────────────
// Phase 1.1 of v0.7.0: when a timed session is running, the page hands the SW
// a list of bell timestamps. SW fires them via setTimeout so they survive
// page/JS suspension when the phone is locked or the tab is backgrounded.
//
// Caveat: Chrome may terminate idle service workers; setTimeout handles are
// lost on termination. Notification Triggers (where supported) and Capacitor
// local notifications (Android v1) are the bullet-proof variants — this is
// the best-effort PWA path. See docs/plans/native-android.md §1.1.

type BellEvent = {
  atMs: number;
  kind: "start" | "interval" | "completion";
  soundUrl: string;
  label: string;
};

const sessionBellTimers = new Map<string, ReturnType<typeof setTimeout>[]>();

function cancelSessionBells(sessionId: string) {
  const timers = sessionBellTimers.get(sessionId);
  if (!timers) return;
  for (const t of timers) clearTimeout(t);
  sessionBellTimers.delete(sessionId);
}

async function fireSessionBell(sessionId: string, bell: BellEvent) {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const hasVisibleClient = clientList.some(
    (c) => (c as WindowClient).visibilityState === "visible",
  );

  // If the page is alive and visible, it handles bells through its own tick —
  // skip to avoid double-ringing.
  if (hasVisibleClient) return;

  // `renotify` is in the Notification spec but missing from the current
  // DOM lib types; cast to allow it so successive session bells re-alert.
  await self.registration.showNotification(bell.label, {
    body: bell.kind === "completion" ? "Session complete." : "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `session-bell:${sessionId}`,
    silent: false,
    data: { url: "/sessions", sessionId, sound: bell.soundUrl },
    renotify: true,
  } as NotificationOptions & { renotify: boolean });
}

function scheduleSessionBells(sessionId: string, bells: BellEvent[]) {
  cancelSessionBells(sessionId);
  const timers: ReturnType<typeof setTimeout>[] = [];
  const now = Date.now();
  for (const bell of bells) {
    const delay = bell.atMs - now;
    if (delay <= 0) continue;
    timers.push(setTimeout(() => fireSessionBell(sessionId, bell), delay));
  }
  sessionBellTimers.set(sessionId, timers);
}

self.addEventListener("message", (event) => {
  const msg = event.data as
    | { type: "SCHEDULE_BELLS"; sessionId: string; bells: BellEvent[] }
    | { type: "CANCEL_BELLS"; sessionId: string }
    | null
    | undefined;
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "SCHEDULE_BELLS") {
    scheduleSessionBells(msg.sessionId, msg.bells);
  } else if (msg.type === "CANCEL_BELLS") {
    cancelSessionBells(msg.sessionId);
  }
});
