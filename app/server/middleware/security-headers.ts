/**
 * Security Headers Middleware
 *
 * Adds standard security headers to all non-API responses.
 * API routes returning JSON are skipped since they don't need CSP.
 */

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
].join("; ");

/**
 * Relaxed CSP for /api-docs — Nitro's Scalar UI loads its bundle from
 * cdn.jsdelivr.net and pulls fonts from Google Fonts. Kept scoped to the
 * docs route so the rest of the app keeps the strict CSP above.
 */
const DOCS_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "connect-src 'self' https://cdn.jsdelivr.net",
  "frame-ancestors 'none'",
].join("; ");

export default defineEventHandler((event) => {
  // Skip API routes that return JSON — they don't need CSP
  if (event.path.startsWith("/api/")) {
    return;
  }

  const isDocs = event.path.startsWith("/api-docs");

  setResponseHeaders(event, {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(self), geolocation=(), payment=()",
    "Content-Security-Policy": isDocs ? DOCS_CSP : CSP,
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  });
});
