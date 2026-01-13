/**
 * Composable for tracking and displaying runtime errors
 * Provides clear error/warning distinction, copy functionality, and clearing
 */

export interface TrackedError {
  id: string;
  type: "error" | "warning" | "info";
  message: string;
  details?: string;
  timestamp: Date;
  source?: string;
  stack?: string;
}

const errors = ref<TrackedError[]>([]);
const isExpanded = ref(false);

export function useErrorTracker() {
  const addError = (
    message: string,
    options: {
      type?: "error" | "warning" | "info";
      details?: string;
      source?: string;
      stack?: string;
    } = {}
  ) => {
    const error: TrackedError = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: options.type || "error",
      message,
      details: options.details,
      timestamp: new Date(),
      source: options.source,
      stack: options.stack,
    };

    errors.value.unshift(error);

    // Auto-expand on first error
    if (errors.value.length === 1) {
      isExpanded.value = true;
    }

    // Limit to 50 errors
    if (errors.value.length > 50) {
      errors.value = errors.value.slice(0, 50);
    }
  };

  const removeError = (id: string) => {
    errors.value = errors.value.filter((e) => e.id !== id);
  };

  const clearErrors = () => {
    errors.value = [];
    isExpanded.value = false;
  };

  const clearByType = (type: "error" | "warning" | "info") => {
    errors.value = errors.value.filter((e) => e.type !== type);
  };

  const copyAllErrors = async () => {
    const text = errors.value
      .map(
        (e) =>
          `[${e.type.toUpperCase()}] ${e.timestamp.toISOString()}\n${e.message}${
            e.details ? `\n${e.details}` : ""
          }${e.stack ? `\n${e.stack}` : ""}\n`
      )
      .join("\n---\n\n");

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const copyError = async (id: string) => {
    const error = errors.value.find((e) => e.id === id);
    if (!error) return false;

    const text = `[${error.type.toUpperCase()}] ${error.timestamp.toISOString()}\n${
      error.message
    }${error.details ? `\n${error.details}` : ""}${
      error.stack ? `\n${error.stack}` : ""
    }`;

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const errorCount = computed(
    () => errors.value.filter((e) => e.type === "error").length
  );
  const warningCount = computed(
    () => errors.value.filter((e) => e.type === "warning").length
  );
  const infoCount = computed(
    () => errors.value.filter((e) => e.type === "info").length
  );
  const totalCount = computed(() => errors.value.length);

  return {
    errors: readonly(errors),
    isExpanded,
    addError,
    removeError,
    clearErrors,
    clearByType,
    copyAllErrors,
    copyError,
    errorCount,
    warningCount,
    infoCount,
    totalCount,
  };
}
