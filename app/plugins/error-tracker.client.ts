/**
 * Client-side error tracking plugin
 * Captures Vue errors, unhandled rejections, and console errors
 * Feeds them to the error tracker for display
 */

export default defineNuxtPlugin((nuxtApp) => {
  // Only run on client in dev mode
  if (!import.meta.client || !import.meta.dev) return;

  const { addError } = useErrorTracker();

  // Capture Vue errors
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const componentName = instance?.$options?.name || "Unknown Component";

    addError(message, {
      type: "error",
      details: `Component: ${componentName}\nInfo: ${info}`,
      source: componentName,
      stack,
    });

    // Still log to console for debugging
    console.error("[Vue Error]", error);
  };

  // Capture Vue warnings
  nuxtApp.vueApp.config.warnHandler = (msg, instance, trace) => {
    const componentName = instance?.$options?.name || "Unknown Component";

    addError(msg, {
      type: "warning",
      details: trace,
      source: componentName,
    });

    // Still log to console
    console.warn("[Vue Warning]", msg);
  };

  // Capture unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    addError(message, {
      type: "error",
      details: "Unhandled Promise Rejection",
      stack,
    });
  });

  // Capture global errors
  window.addEventListener("error", (event) => {
    // Avoid duplicate reporting of Vue errors
    if (event.message.includes("[Vue Error]")) return;

    addError(event.message, {
      type: "error",
      details: `${event.filename}:${event.lineno}:${event.colno}`,
      source: event.filename,
    });
  });
});
