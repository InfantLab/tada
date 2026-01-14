/**
 * Toast Notification Composable
 * Provides app-wide toast notifications with different types and auto-dismiss
 */

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  dismissible: boolean;
  action?: ToastAction;
}

export interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
  action?: ToastAction;
}

const toasts = ref<Toast[]>([]);

export const useToast = () => {
  const showToast = (
    message: string,
    type: ToastType = "info",
    options: ToastOptions = {}
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = options.duration ?? 5000;

    const toast: Toast = {
      id,
      message,
      type,
      duration,
      dismissible: options.dismissible ?? true,
      action: options.action,
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

  // Convenience methods with options support
  const success = (message: string, options?: ToastOptions | number) => {
    const opts = typeof options === "number" ? { duration: options } : options;
    return showToast(message, "success", opts);
  };

  const error = (message: string, options?: ToastOptions | number) => {
    const opts = typeof options === "number" ? { duration: options } : options;
    return showToast(message, "error", opts);
  };

  const warning = (message: string, options?: ToastOptions | number) => {
    const opts = typeof options === "number" ? { duration: options } : options;
    return showToast(message, "warning", opts);
  };

  const info = (message: string, options?: ToastOptions | number) => {
    const opts = typeof options === "number" ? { duration: options } : options;
    return showToast(message, "info", opts);
  };

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
