/**
 * Standard API Response Formatting Utilities
 *
 * Provides consistent response formatting for all API endpoints.
 */

import type { H3Event, H3Error } from "h3";
import type {
  ApiResponse,
  PaginatedResponse,
  RateLimitInfo,
} from "~/types/api";

/**
 * Input shape for createError() — compatible with Partial<H3Error>
 */
type H3ErrorInput = Partial<H3Error> & {
  status?: number;
  statusText?: string;
};

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
  meta?: Record<string, unknown>,
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
 * Create an API error compatible with createError()
 *
 * @param event H3Event
 * @param code Error code
 * @param message Error message
 * @param statusCode HTTP status code
 * @param details Optional error details
 * @returns H3ErrorInput — pass directly to createError()
 */
export function apiError(
  event: H3Event,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>,
): H3ErrorInput {
  return {
    statusCode,
    message,
    data: {
      error: {
        code,
        message,
        ...(details && { details }),
      },
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
    setResponseHeader(event, "Retry-After", info.retryAfter);
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
 * Create a rate limit exceeded (429) error compatible with createError()
 *
 * @param event H3Event
 * @param info Rate limit information
 * @returns H3ErrorInput
 */
export function rateLimitExceeded(
  event: H3Event,
  info: RateLimitInfo,
): H3ErrorInput {
  setRateLimitHeaders(event, info);

  return {
    statusCode: 429,
    message: `Rate limit exceeded. Retry after ${info.retryAfter} seconds.`,
    data: {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Rate limit exceeded. Retry after ${info.retryAfter} seconds.`,
        details: {
          limit: info.limit,
          reset: info.reset,
          retryAfter: info.retryAfter,
        },
      },
    },
  };
}

/**
 * Create an unauthorized (401) error compatible with createError()
 *
 * @param event H3Event
 * @param message Optional custom message
 * @returns H3ErrorInput
 */
export function unauthorized(
  _event: H3Event,
  message: string = "Authentication required",
): H3ErrorInput {
  return {
    statusCode: 401,
    message,
    data: {
      error: {
        code: "UNAUTHORIZED",
        message,
      },
    },
  };
}

/**
 * Create a forbidden (403) error compatible with createError()
 *
 * @param event H3Event
 * @param message Optional custom message
 * @returns H3ErrorInput
 */
export function forbidden(
  _event: H3Event,
  message: string = "Permission denied",
): H3ErrorInput {
  return {
    statusCode: 403,
    message,
    data: {
      error: {
        code: "FORBIDDEN",
        message,
      },
    },
  };
}

/**
 * Create a not found (404) error compatible with createError()
 *
 * @param event H3Event
 * @param resource Resource type that was not found
 * @returns H3ErrorInput
 */
export function notFound(
  _event: H3Event,
  resource: string = "Resource",
): H3ErrorInput {
  return {
    statusCode: 404,
    message: `${resource} not found`,
    data: {
      error: {
        code: "NOT_FOUND",
        message: `${resource} not found`,
      },
    },
  };
}

/**
 * Create a validation error (422) compatible with createError()
 *
 * @param event H3Event
 * @param errors Validation errors
 * @returns H3ErrorInput
 */
export function validationError(
  _event: H3Event,
  errors: Record<string, string[]>,
): H3ErrorInput {
  return {
    statusCode: 422,
    message: "Validation failed",
    data: {
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: { errors },
      },
    },
  };
}

/**
 * Create an internal server error (500) compatible with createError()
 *
 * @param event H3Event
 * @param message Optional custom message
 * @returns H3ErrorInput
 */
export function internalError(
  _event: H3Event,
  message: string = "Internal server error",
): H3ErrorInput {
  return {
    statusCode: 500,
    message,
    data: {
      error: {
        code: "INTERNAL_ERROR",
        message,
      },
    },
  };
}
