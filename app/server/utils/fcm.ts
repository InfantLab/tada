/**
 * FCM v1 API utility — sends push notifications via Firebase Cloud Messaging.
 *
 * Uses only Node's built-in crypto (no firebase-admin dependency).
 * Authenticates via a service account JWT exchanged for an OAuth2 access token.
 * Tokens are cached for their 1-hour lifetime.
 *
 * Requires env var: FIREBASE_SERVICE_ACCOUNT — the full service account JSON
 * as a single-line string (copy the JSON file contents, minify to one line).
 */

import { createSign } from "node:crypto";

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
}

let parsedSa: ServiceAccount | null | undefined; // undefined = not yet attempted

function getServiceAccount(): ServiceAccount | null {
  if (parsedSa !== undefined) return parsedSa;
  const raw = process.env["FIREBASE_SERVICE_ACCOUNT"];
  if (!raw) {
    parsedSa = null;
    return null;
  }
  try {
    parsedSa = JSON.parse(raw) as ServiceAccount;
    return parsedSa;
  } catch {
    parsedSa = null;
    return null;
  }
}

// Cached access token
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  ).toString("base64url");

  const unsigned = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  const sig = sign.sign(sa.private_key, "base64url");
  const jwt = `${unsigned}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM auth failed ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return tokenCache.token;
}

export interface FcmMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification via FCM.
 * Throws with statusCode === 410 when the token is expired/unregistered
 * (caller should mark it disabled in the DB).
 */
export async function sendFcmNotification(message: FcmMessage): Promise<void> {
  const sa = getServiceAccount();
  if (!sa) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");

  const accessToken = await getAccessToken(sa);

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: message.token,
          notification: { title: message.title, body: message.body },
          data: message.data,
          android: {
            notification: {
              icon: "ic_stat_notify",
              color: "#10b981",
              channel_id: "tada_push",
            },
          },
        },
      }),
    },
  );

  if (res.ok) return;

  // 404 = token not registered; treat as expired
  if (res.status === 404 || res.status === 410) {
    const e = new Error("FCM token expired/unregistered");
    (e as unknown as { statusCode: number }).statusCode = 410;
    throw e;
  }

  const text = await res.text();
  throw new Error(`FCM send failed ${res.status}: ${text}`);
}

export function isFcmConfigured(): boolean {
  return getServiceAccount() !== null;
}
