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

export default defineEventHandler((event) => {
  // Skip API routes that return JSON — they don't need CSP
  if (event.path.startsWith("/api/")) {
    return;
  }

  setResponseHeaders(event, {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(self), geolocation=(), payment=()",
    "Content-Security-Policy": CSP,
  });
});
