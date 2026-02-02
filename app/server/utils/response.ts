/**
 * Standard API Response Formatting Utilities
 *
 * Provides consistent response formatting for all API endpoints.
 */

import type { H3Event } from "h3";
import type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  RateLimitInfo,
} from "~/types/api";

/**
 * Send a successful API response
 *
 * @param event H3Event
 * @param data Response data
 * @param meta Optional metadata
 * @returns ApiResponse
 */
export function success<T>(
  event: H3Event,
  data: T,
  meta?: Record<string, any>,
): ApiResponse<T> {
  setResponseStatus(event, 200);
  return {
    data,
    ...(meta && { meta }),
  };
}

/**
 * Send a created (201) response
 *
 * @param event H3Event
 * @param data Response data
 * @returns ApiResponse
 */
export function created<T>(event: H3Event, data: T): ApiResponse<T> {
  setResponseStatus(event, 201);
  return {
    data,
    meta: {
      created: true,
    },
  };
}

/**
 * Send a paginated response
 *
 * @param event H3Event
 * @param data Array of items
 * @param total Total count
 * @param limit Items per page
 * @param offset Current offset
 * @returns PaginatedResponse
 */
export function paginated<T>(
  event: H3Event,
  data: T[],
  total: number,
  limit: number,
  offset: number,
): PaginatedResponse<T> {
  const hasMore = offset + data.length < total;

  setResponseStatus(event, 200);
  return {
    data,
    meta: {
      total,
      limit,
      offset,
      hasMore,
    },
  };
}

/**
 * Send an API error response
 *
 * @param event H3Event
 * @param code Error code
 * @param message Error message
 * @param statusCode HTTP status code
 * @param details Optional error details
 * @returns ApiError
 */
export function apiError(
  event: H3Event,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, any>,
): ApiError {
  setResponseStatus(event, statusCode);
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Set rate limit headers on response
 *
 * @param event H3Event
 * @param info Rate limit information
 */
export function setRateLimitHeaders(
  event: H3Event,
  info: RateLimitInfo,
): void {
  setResponseHeaders(event, {
    "X-RateLimit-Limit": String(info.limit),
    "X-RateLimit-Remaining": String(info.remaining),
    "X-RateLimit-Reset": String(info.reset),
  });

  if (info.retryAfter !== undefined) {
    setResponseHeader(event, "Retry-After", String(info.retryAfter));
  }
}

/**
 * Set API version header on response
 *
 * @param event H3Event
 * @param version API version (default: "1.0")
 */
export function setApiVersionHeader(
  event: H3Event,
  version: string = "1.0",
): void {
  setResponseHeader(event, "X-API-Version", version);
}

/**
 * Send a rate limit exceeded (429) response
 *
 * @param event H3Event
 * @param info Rate limit information
 * @returns ApiError
 */
export function rateLimitExceeded(
  event: H3Event,
  info: RateLimitInfo,
): ApiError {
  setRateLimitHeaders(event, info);
  setResponseStatus(event, 429);

  return {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: `Rate limit exceeded. Retry after ${info.retryAfter} seconds.`,
      details: {
        limit: info.limit,
        reset: info.reset,
        retryAfter: info.retryAfter,
      },
    },
  };
}

/**
 * Send an unauthorized (401) response
 *
 * @param event H3Event
 * @param message Optional custom message
 * @returns ApiError
 */
export function unauthorized(
  event: H3Event,
  message: string = "Authentication required",
): ApiError {
  setResponseStatus(event, 401);
  return {
    error: {
      code: "UNAUTHORIZED",
      message,
    },
  };
}

/**
 * Send a forbidden (403) response
 *
 * @param event H3Event
 * @param message Optional custom message
 * @returns ApiError
 */
export function forbidden(
  event: H3Event,
  message: string = "Permission denied",
): ApiError {
  setResponseStatus(event, 403);
  return {
    error: {
      code: "FORBIDDEN",
      message,
    },
  };
}

/**
 * Send a not found (404) response
 *
 * @param event H3Event
 * @param resource Resource type that was not found
 * @returns ApiError
 */
export function notFound(
  event: H3Event,
  resource: string = "Resource",
): ApiError {
  setResponseStatus(event, 404);
  return {
    error: {
      code: "NOT_FOUND",
      message: `${resource} not found`,
    },
  };
}

/**
 * Send a validation error (422) response
 *
 * @param event H3Event
 * @param errors Validation errors
 * @returns ApiError
 */
export function validationError(
  event: H3Event,
  errors: Record<string, string[]>,
): ApiError {
  setResponseStatus(event, 422);
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: { errors },
    },
  };
}

/**
 * Send an internal server error (500) response
 *
 * @param event H3Event
 * @param message Optional custom message
 * @returns ApiError
 */
export function internalError(
  event: H3Event,
  message: string = "Internal server error",
): ApiError {
  setResponseStatus(event, 500);
  return {
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  };
}
