/**
 * Create Android notification channels on startup.
 *
 * Android 8+ requires all notifications to belong to a channel. The channel
 * controls whether sound, vibration, and heads-up banners are enabled — and
 * these settings are set once at channel creation. Individual notification
 * payloads cannot override channel-level sound/importance.
 *
 * Capacitor makes createChannel() idempotent: calling it again with the same
 * ID is a safe no-op on Android (name/description can update; sound/importance
 * cannot change after the first creation — user controls those from then on).
 *
 * Two channels:
 *   tada_bells  — session interval bells (HIGH importance, bell sound, vibration)
 *   tada_push   — weekly rhythm push notifications (DEFAULT importance, system sound)
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export default defineNuxtPlugin(async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await LocalNotifications.createChannel({
      id: "tada_bells",
      name: "Session Bells",
      description: "Interval bells during meditation and focus sessions",
      importance: 5, // IMPORTANCE_HIGH — heads-up even while phone is in use
      sound: "bell", // res/raw/bell.mp3 — the default bell; individual notifications may override
      vibration: true,
      visibility: 1, // VISIBILITY_PUBLIC
    });

    await LocalNotifications.createChannel({
      id: "tada_push",
      name: "Rhythm Updates",
      description: "Weekly celebration and encouragement notifications",
      importance: 3, // IMPORTANCE_DEFAULT — appears in shade, plays system sound
      vibration: false,
      visibility: 1,
    });
  } catch {
    // Channel creation failures are non-fatal — notifications fall back to the
    // system default channel (no sound, which is the bug we're fixing, but
    // a crash here would be worse).
  }
});
