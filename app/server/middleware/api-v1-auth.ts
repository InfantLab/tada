/**
 * API v1 Authentication Middleware
 *
 * Handles authentication for all /api/v1/* endpoints.
 * Supports both API key (Bearer token) and session-based authentication.
 *
 * NOTE: Nitro does NOT support directory-scoped _middleware.ts files in
 * server/api/ — all server middleware must be in server/middleware/.
 */

import type { H3Event } from "h3";
import { validateApiKey } from "~/server/utils/api-key";
import { validateSessionRequest } from "~/server/utils/auth";
import { checkRateLimit } from "~/server/services/rate-limit";
import {
  setRateLimitHeaders,
  setApiVersionHeader,
  rateLimitExceeded,
  unauthorized,
} from "~/server/utils/response";
import type { ApiAuthContext, Permission } from "~/types/api";

export default defineEventHandler(async (event: H3Event) => {
  const path = event.path;

  // Only apply to /api/v1/ routes
  if (!path.startsWith("/api/v1/")) {
    return;
  }

  // Skip middleware for health check endpoint
  if (path === "/api/v1/health") {
    return;
  }

  // Set API version header on all responses
  setApiVersionHeader(event, "1.0");

  // Extract authentication credentials
  const authHeader = getHeader(event, "Authorization");

  let authContext: ApiAuthContext | undefined;

  // Try API key authentication (Bearer token)
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    const apiKeyRecord = await validateApiKey(token);

    if (apiKeyRecord) {
      authContext = {
        userId: apiKeyRecord.userId,
        permissions: apiKeyRecord.permissions as Permission[],
        apiKeyId: apiKeyRecord.id,
        type: "api_key",
      };

      event.context.auth = authContext;
    } else {
      throw createError(unauthorized(event, "Invalid API key"));
    }
  } else {
    // Try session-based authentication
    const { session, user } = await validateSessionRequest(event);

    if (session && user) {
      authContext = {
        userId: user.id,
        permissions: [], // Sessions have all permissions
        sessionId: session.id,
        type: "session",
      };

      event.context.auth = authContext;
    }
  }

  // If no valid authentication found, return 401
  if (!authContext) {
    throw createError(unauthorized(event, "Authentication required"));
  }

  // Determine rate limit type based on endpoint
  let rateLimitType: "standard" | "export" | "pattern" | "webhook" | "admin" =
    "standard";

  if (path.startsWith("/api/v1/admin/")) {
    rateLimitType = "admin";
  } else if (path.includes("/export")) {
    rateLimitType = "export";
  } else if (path.includes("/insights")) {
    rateLimitType = "pattern";
  } else if (path.includes("/webhooks")) {
    rateLimitType = "webhook";
  }

  // Apply rate limiting
  const identifier =
    authContext.apiKeyId || authContext.sessionId || authContext.userId;
  const rateLimit = checkRateLimit(identifier, rateLimitType);

  // Set rate limit headers on response
  setRateLimitHeaders(event, rateLimit.info);

  // If rate limit exceeded, return 429
  if (!rateLimit.allowed) {
    throw createError(rateLimitExceeded(event, rateLimit.info));
  }
});
