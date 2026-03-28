/**
 * VAPID push notification utility.
 * Wraps web-push with lazy initialisation and typed helpers.
 */

import webPush from "web-push";

let initialised = false;

function ensureInitialised(): void {
  if (initialised) return;

  const subject = process.env["VAPID_SUBJECT"];
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];

  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      "VAPID env vars not set (VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)",
    );
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  initialised = true;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Send a push notification.
 * Throws on non-410 errors.
 * On 410 (Gone / subscription expired) throws an error with statusCode === 410
 * so callers can detect it and mark the subscription disabled.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionKeys,
  payload: object,
): Promise<void> {
  ensureInitialised();

  try {
    await webPush.sendNotification(
      subscription,
      JSON.stringify(payload),
    );
  } catch (err: unknown) {
    const asAny = err as { statusCode?: number };
    if (asAny?.statusCode === 410) {
      const e = new Error("Push subscription expired (410)");
      (e as unknown as { statusCode: number }).statusCode = 410;
      throw e;
    }
    throw err;
  }
}

/**
 * Returns true when all three VAPID env vars are present.
 */
export function isVapidConfigured(): boolean {
  return (
    !!process.env["VAPID_SUBJECT"] &&
    !!process.env["VAPID_PUBLIC_KEY"] &&
    !!process.env["VAPID_PRIVATE_KEY"]
  );
}
