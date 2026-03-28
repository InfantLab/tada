/**
 * GET /api/push/vapid-key
 * Returns the server VAPID public key so the client can subscribe.
 * No auth required — the public key is safe to expose.
 */

export default defineEventHandler(() => {
  return { publicKey: process.env["VAPID_PUBLIC_KEY"] ?? null };
});
