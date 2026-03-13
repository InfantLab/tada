/**
 * Global error handler plugin
 * Catches uncaught exceptions and unhandled rejections, logs them properly.
 * Logs request completion with duration, requestId, and userId for all errors
 * and slow requests (>2s).
 */

import { createLogger } from "~/server/utils/logger";

const logger = createLogger("error-handler");

const SLOW_REQUEST_THRESHOLD_MS = 2000;

export default defineNitroPlugin((nitroApp) => {
  // Handle uncaught exceptions
  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught exception", error, {
      type: "uncaughtException",
    });

    // Don't exit in dev mode - let Nuxt handle it
    if (process.env["NODE_ENV"] === "production") {
      process.exit(1);
    }
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error("Unhandled promise rejection", error, {
      type: "unhandledRejection",
      reason: String(reason),
    });
  });

  // Log request completion with timing and context
  nitroApp.hooks.hook("request", (event) => {
    const originalEnd = event.node.res.end;
    event.node.res.end = function (
      this: typeof event.node.res,
      ...args: unknown[]
    ) {
      const statusCode = event.node.res.statusCode;
      const startTime = event.context.requestStartTime as number | undefined;
      const durationMs = startTime ? Date.now() - startTime : undefined;
      const requestId = event.context.requestId as string | undefined;
      const userId = event.context.user?.id as string | undefined;

      const ctx = {
        method: event.node.req.method,
        url: event.node.req.url,
        statusCode,
        durationMs,
        requestId,
        userId,
      };

      if (statusCode >= 500) {
        logger.error("Request failed", undefined, ctx);
      } else if (statusCode >= 400) {
        logger.warn("Request error", ctx);
      } else if (durationMs && durationMs > SLOW_REQUEST_THRESHOLD_MS) {
        logger.warn("Slow request", ctx);
      }

      return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
    };
  });

  logger.info("Error handler plugin initialized");
});
