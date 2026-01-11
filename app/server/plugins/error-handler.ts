/**
 * Global error handler plugin
 * Catches uncaught exceptions and unhandled rejections, logs them properly
 */

import { createLogger } from "~/server/utils/logger";

const logger = createLogger("error-handler");

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

  // Log when the server is ready
  nitroApp.hooks.hook("request", (event) => {
    // Add error logging for requests
    const originalEnd = event.node.res.end;
    event.node.res.end = function (
      this: typeof event.node.res,
      ...args: unknown[]
    ) {
      // Log request errors if status >= 400
      if (event.node.res.statusCode >= 400) {
        logger.warn("Request error", {
          method: event.node.req.method,
          url: event.node.req.url,
          statusCode: event.node.res.statusCode,
        });
      }
      return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
    };
  });

  logger.info("Error handler plugin initialized");
});
