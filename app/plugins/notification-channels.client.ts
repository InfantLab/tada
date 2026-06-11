/**
 * Create Android notification channels on startup.
 *
 * Android 8+ requires all notifications to belong to a channel. Critically,
 * the channel — not the individual notification — controls which sound plays.
 * A notification's own `sound` field is ignored when a channelId is set.
 *
 * The only way to play per-session bell sounds (bell, gong, chime, cymbal,
 * twinkle, gong2) is to create one channel per sound. Each channel references
 * its corresponding file in res/raw/. When scheduling a bell notification,
 * use bellChannelId(soundUrl) to pick the right channel.
 *
 * createChannel() is idempotent — safe to call on every app launch.
 * Sound/importance cannot change after first creation (Android enforces this);
 * to update, bump the channel ID suffix (e.g. _v2) and stop using the old one.
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

// All bundled bell sounds. Each gets its own channel so the right file plays.
export const BELL_SOUNDS = ["bell", "gong", "gong2", "chime", "cymbal", "twinkle"] as const;
export type BellSound = typeof BELL_SOUNDS[number];

/** Returns the channel ID to use when scheduling a notification for this sound. */
export function bellChannelId(soundName: string | undefined): string {
  return BELL_SOUNDS.includes(soundName as BellSound)
    ? `tada_bell_${soundName}`
    : "tada_bell_bell"; // fallback
}

export default defineNuxtPlugin(async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // One channel per bell sound — Android uses the channel's sound, not the notification's.
    for (const sound of BELL_SOUNDS) {
      await LocalNotifications.createChannel({
        id: `tada_bell_${sound}`,
        name: `Session Bells (${sound.charAt(0).toUpperCase() + sound.slice(1)})`,
        description: "Interval bells during meditation and focus sessions",
        importance: 5, // IMPORTANCE_HIGH — heads-up even while phone is in use
        sound,         // filename in res/raw/ without extension
        vibration: true,
        visibility: 1, // VISIBILITY_PUBLIC
      });
    }

    // Rhythm push notifications (weekly celebrations + encouragements)
    await LocalNotifications.createChannel({
      id: "tada_push",
      name: "Rhythm Updates",
      description: "Weekly celebration and encouragement notifications",
      importance: 3, // IMPORTANCE_DEFAULT
      vibration: false,
      visibility: 1,
    });
  } catch {
    // Non-fatal — worst case notifications fall back to system default channel.
  }
});
