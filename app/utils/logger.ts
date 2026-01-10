/**
 * Client-side logger
 * Prefixed console logs with timestamps
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class ClientLogger {
  private prefix: string;

  constructor(prefix = "tada") {
    this.prefix = prefix;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().split("T")[1]?.split(".")[0] || "00:00:00";
    const emoji = {
      debug: "🔍",
      info: "ℹ️",
      warn: "⚠️",
      error: "❌",
    }[level];
    return `${emoji} [${timestamp}] [${this.prefix}] ${message}`;
  }

  debug(message: string, ...args: unknown[]) {
    console.log(this.formatMessage("debug", message), ...args);
  }

  info(message: string, ...args: unknown[]) {
    console.info(this.formatMessage("info", message), ...args);
  }

  warn(message: string, ...args: unknown[]) {
    console.warn(this.formatMessage("warn", message), ...args);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const formattedMessage = this.formatMessage("error", message);
    if (error instanceof Error) {
      console.error(formattedMessage, error, context);
    } else {
      console.error(formattedMessage, error, context);
    }
  }

  child(childPrefix: string): ClientLogger {
    return new ClientLogger(`${this.prefix}:${childPrefix}`);
  }
}

// Export singleton
export const logger = new ClientLogger("tada");

// Export factory
export function createLogger(prefix: string): ClientLogger {
  return logger.child(prefix);
}
