/**
 * Signed token helpers for weekly-rhythm email unsubscribe links.
 * Uses HMAC-SHA256 with a server-side secret.
 */

import { createHmac } from "crypto";

interface UnsubscribePayload {
  userId: string;
  scope: "email";
  issuedAt: number; // unix timestamp (ms)
}

export function generateUnsubscribeToken(
  userId: string,
  secret: string,
): { token: string; payload: UnsubscribePayload } {
  const issuedAt = Date.now();
  const payload: UnsubscribePayload = { userId, scope: "email", issuedAt };

  const data = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(data).digest("hex");

  // Format: base64url(JSON) . hex(signature)
  const token =
    Buffer.from(data).toString("base64url") + "." + signature;
  return { token, payload };
}

export function verifyUnsubscribeToken(
  token: string,
  secret: string,
  maxAgeMs: number = 30 * 24 * 60 * 60 * 1000, // 30 days default
): { valid: boolean; payload?: UnsubscribePayload; error?: string } {
  try {
    const dotIndex = token.indexOf(".");
    if (dotIndex === -1) {
      return { valid: false, error: "Malformed token" };
    }

    const data64 = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    if (!data64 || !sig) {
      return { valid: false, error: "Malformed token" };
    }

    const data = Buffer.from(data64, "base64url").toString("utf8");
    const expectedSig = createHmac("sha256", secret)
      .update(data)
      .digest("hex");

    // Constant-time comparison
    if (sig.length !== expectedSig.length) {
      return { valid: false, error: "Invalid signature" };
    }
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length || !sigBuf.equals(expectedBuf)) {
      return { valid: false, error: "Invalid signature" };
    }

    const payload: UnsubscribePayload = JSON.parse(data);
    const age = Date.now() - payload.issuedAt;

    if (age > maxAgeMs) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Token verification failed" };
  }
}
