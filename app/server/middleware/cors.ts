/**
 * CORS Middleware
 *
 * Configures Cross-Origin Resource Sharing for API endpoints
 *
 * Phase 10: Polish & Cross-Cutting Concerns
 */

export default defineEventHandler((event) => {
  const origin = getRequestHeader(event, "origin");

  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(",")
    : [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://tada.app", // Production domain
      ];

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    setResponseHeader(event, "Access-Control-Allow-Origin", origin);
  } else if (allowedOrigins.includes("*")) {
    // Allow all origins if * is in the list (not recommended for production)
    setResponseHeader(event, "Access-Control-Allow-Origin", "*");
  }

  // Set other CORS headers
  setResponseHeader(
    event,
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  );
  setResponseHeader(
    event,
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  setResponseHeader(event, "Access-Control-Allow-Credentials", "true");
  setResponseHeader(event, "Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight OPTIONS requests
  if (event.method === "OPTIONS") {
    setResponseStatus(event, 204);
    return "";
  }
});
