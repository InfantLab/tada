/**
 * Error Handling Utilities
 *
 * Provides consistent error handling patterns across the application:
 * - Type-safe error extraction
 * - User-friendly error messages
 * - Structured logging
 */

/**
 * Extract a user-friendly error message from any error type
 */
export function getErrorMessage(
  err: unknown,
  fallback = "An error occurred",
): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  if (err && typeof err === "object" && "message" in err) {
    return String(err.message);
  }
  if (err && typeof err === "object" && "statusMessage" in err) {
    return String(err.statusMessage);
  }
  return fallback;
}

/**
 * Format error for console logging with context
 */
export function logError(
  context: string,
  err: unknown,
  additionalInfo?: Record<string, unknown>,
): void {
  const message = getErrorMessage(err, "Unknown error");
  console.error(`[${context}]`, message, {
    error: err,
    ...additionalInfo,
  });
}

/**
 * Handle async errors with toast notification
 */
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  context: string,
  userMessage?: string,
): Promise<T | null> {
  const toast = useToast();
  try {
    return await operation();
  } catch (err) {
    logError(context, err);
    toast.error(userMessage || getErrorMessage(err, "Operation failed"));
    return null;
  }
}

/**
 * Wrap a function to safely handle errors
 */
export function safeExecute<T>(
  fn: () => T,
  fallback: T,
  onError?: (err: unknown) => void,
): T {
  try {
    return fn();
  } catch (err) {
    if (onError) {
      onError(err);
    }
    return fallback;
  }
}

/**
 * Extract HTTP error details for better user feedback
 */
export function getHttpErrorDetails(err: unknown): {
  statusCode: number;
  message: string;
} {
  if (err && typeof err === "object") {
    const statusCode =
      "statusCode" in err && typeof err.statusCode === "number"
        ? err.statusCode
        : 500;
    const message = getErrorMessage(err, "Request failed");
    return { statusCode, message };
  }
  return { statusCode: 500, message: "Request failed" };
}

/**
 * Type guard to check if error is a fetch error with status
 */
export function isFetchError(
  err: unknown,
): err is { statusCode: number; message: string } {
  return (
    err !== null &&
    typeof err === "object" &&
    "statusCode" in err &&
    typeof err.statusCode === "number"
  );
}
