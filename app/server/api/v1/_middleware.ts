/**
 * API v1 Authentication Middleware
 *
 * Handles authentication for all /api/v1/* endpoints.
 * Supports both API key (Bearer token) and session-based authentication.
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
import type { ApiAuthContext } from "~/types/api";

/**
 * Authentication middleware for API v1
 * Runs on all /api/v1/* requests
 */
export default defineEventHandler(async (event: H3Event) => {
  const path = event.path;

  // Skip middleware for health check endpoint
  if (path === "/api/v1/health") {
    return;
  }

  // Set API version header on all responses
  setApiVersionHeader(event, "1.0");

  // Extract authentication credentials
  const authHeader = getHeader(event, "Authorization");

  let authContext: ApiAuthContext | null = null;

  // Try API key authentication (Bearer token)
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    const apiKeyRecord = await validateApiKey(token);

    if (apiKeyRecord) {
      // Valid API key
      authContext = {
        userId: apiKeyRecord.userId,
        permissions: apiKeyRecord.permissions,
        apiKeyId: apiKeyRecord.id,
        type: "api_key",
      };

      // Set auth context
      event.context.auth = authContext;
    } else {
      // Invalid API key
      throw createError(unauthorized(event, "Invalid API key"));
    }
  } else {
    // Try session-based authentication
    const { session, user } = await validateSessionRequest(event);

    if (session && user) {
      // Valid session
      authContext = {
        userId: user.id,
        permissions: [], // Sessions have all permissions
        sessionId: session.id,
        type: "session",
      };

      // Set auth context
      event.context.auth = authContext;
    }
  }

  // If no valid authentication found, return 401
  if (!authContext) {
    throw createError(unauthorized(event, "Authentication required"));
  }

  // Determine rate limit type based on endpoint
  let rateLimitType: "standard" | "export" | "pattern" | "webhook" = "standard";

  if (path.includes("/export")) {
    rateLimitType = "export";
  } else if (path.includes("/insights")) {
    rateLimitType = "pattern";
  } else if (path.includes("/webhooks")) {
    rateLimitType = "webhook";
  }

  // Apply rate limiting
  const identifier = authContext.apiKeyId || authContext.sessionId || authContext.userId;
  const rateLimit = checkRateLimit(identifier, rateLimitType);

  // Set rate limit headers on response
  setRateLimitHeaders(event, rateLimit.info);

  // If rate limit exceeded, return 429
  if (!rateLimit.allowed) {
    throw createError(rateLimitExceeded(event, rateLimit.info));
  }

  // Authentication and rate limiting passed - proceed to endpoint
});
