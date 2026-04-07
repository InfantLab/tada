/**
 * Ourmoji request validation + error mapping helpers.
 *
 * Centralises Zod-error → HTTP error translation so endpoint handlers
 * stay small. Also exposes a shared MAX_TEXT_LENGTH guard used by both
 * the daily reflection and the dream submission flows (T056).
 */

import { createError } from "h3";
import type { ZodError, ZodSchema } from "zod";

import { MAX_TEXT_LENGTH } from "~/utils/ourmoji/constants";

/**
 * Parse `input` against `schema` and throw an h3 400 error on failure.
 * Returns the validated payload on success.
 */
export function parseOrThrow<T>(
  schema: ZodSchema<T>,
  input: unknown,
  context: string,
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${context}`,
      data: flattenZodError(result.error),
    });
  }
  return result.data;
}

export function flattenZodError(error: ZodError) {
  return {
    formErrors: error.flatten().formErrors,
    fieldErrors: error.flatten().fieldErrors,
  };
}

/**
 * Enforce the shared 5000-character limit on user-supplied free text.
 * Returns a trimmed string. Throws 400 if the limit is exceeded.
 */
export function enforceTextLength(
  value: string,
  fieldName: string,
  max = MAX_TEXT_LENGTH,
): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName} must not be empty`,
    });
  }
  if (trimmed.length > max) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName} exceeds ${max}-character limit`,
      data: { length: trimmed.length, max },
    });
  }
  return trimmed;
}

/**
 * Soft warning threshold (90% of max) — services may surface this to the
 * UI without rejecting the submission.
 */
export function isApproachingTextLimit(value: string, max = MAX_TEXT_LENGTH) {
  return value.length >= Math.floor(max * 0.9);
}

/** Map an internal "not found" condition to a clean 404. */
export function notFound(resource: string): never {
  throw createError({
    statusCode: 404,
    statusMessage: `${resource} not found`,
  });
}

/** Map an internal "forbidden" condition to a clean 403. */
export function forbidden(reason: string): never {
  throw createError({
    statusCode: 403,
    statusMessage: reason,
  });
}
