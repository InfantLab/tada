/**
 * Toast Notification Composable
 * Provides app-wide toast notifications with different types and auto-dismiss
 */

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  dismissible: boolean;
}

const toasts = ref<Toast[]>([]);

export const useToast = () => {
  const showToast = (
    message: string,
    type: ToastType = "info",
    duration: number = 5000,
    dismissible: boolean = true
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const toast: Toast = {
      id,
      message,
      type,
      duration,
      dismissible,
    };

    toasts.value.push(toast);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  };

  const dismissToast = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  };

  const clearAll = () => {
    toasts.value = [];
  };

  // Convenience methods
  const success = (message: string, duration?: number) =>
    showToast(message, "success", duration);

  const error = (message: string, duration?: number) =>
    showToast(message, "error", duration);

  const warning = (message: string, duration?: number) =>
    showToast(message, "warning", duration);

  const info = (message: string, duration?: number) =>
    showToast(message, "info", duration);

  return {
    toasts: readonly(toasts),
    showToast,
    dismissToast,
    clearAll,
    success,
    error,
    warning,
    info,
  };
};
