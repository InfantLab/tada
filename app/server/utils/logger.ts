/**
 * Server-side structured logger
 * Outputs JSON logs to both stderr and rotating log files
 *
 * Log level controlled by LOG_LEVEL env var (default: "info" in production, "debug" in development)
 *
 * File writes are async and buffered — logs are queued in memory and flushed
 * periodically (every 1s) or when the buffer reaches 50 entries, avoiding
 * blocking the event loop on every log call.
 */

import {
  appendFile,
  appendFileSync,
  mkdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLogLevel(): LogLevel {
  const env = process.env["LOG_LEVEL"]?.toLowerCase();
  if (env && env in LOG_LEVEL_PRIORITY) return env as LogLevel;
  return process.env["NODE_ENV"] === "production" ? "info" : "debug";
}

interface LogContext {
  [key: string]: unknown;
}

// Async write buffer — collects log lines and flushes periodically
const writeBuffers: Map<string, string[]> = new Map();
let flushTimer: ReturnType<typeof setInterval> | null = null;
const FLUSH_INTERVAL_MS = 1000;
const FLUSH_THRESHOLD = 50;

function getBuffer(logFile: string): string[] {
  let buf = writeBuffers.get(logFile);
  if (!buf) {
    buf = [];
    writeBuffers.set(logFile, buf);
  }
  return buf;
}

function startFlushTimer(logDir: string) {
  if (flushTimer) return;
  flushTimer = setInterval(() => flushAllBuffers(logDir), FLUSH_INTERVAL_MS);
  // Don't let the timer prevent process exit
  if (flushTimer && typeof flushTimer === "object" && "unref" in flushTimer) {
    flushTimer.unref();
  }
}

function flushAllBuffers(logDir: string) {
  for (const [logFile, lines] of writeBuffers.entries()) {
    if (lines.length === 0) continue;
    const batch = lines.splice(0, lines.length);
    const content = batch.join("\n") + "\n";
    appendFile(join(logDir, logFile), content, "utf8", () => {
      // Fire-and-forget — errors are silently ignored (console output is the primary sink)
    });
  }
}

class Logger {
  private prefix: string;
  private logDir: string;
  private maxLogSizeMB = 10;
  private maxLogFiles = 5;

  constructor(prefix = "") {
    this.prefix = prefix;
    // Store logs in data/logs/ directory
    // In production (built .output), DATABASE_URL points to /data/db.sqlite
    // In development, it's relative to app/data/db.sqlite
    const dbUrl = process.env["DATABASE_URL"] || "";
    if (dbUrl.includes("/data/")) {
      // Production: /data is the persistent volume mount point
      this.logDir = "/data/logs";
    } else {
      // Development: relative to current working directory
      this.logDir = join(process.cwd(), "data", "logs");
    }
    this.ensureLogDirectory();
    startFlushTimer(this.logDir);
  }

  private ensureLogDirectory() {
    try {
      mkdirSync(this.logDir, { recursive: true });
    } catch {
      // Directory exists or can't be created - fail silently for stderr fallback
      // This is intentional - we want logging to work even if file logging fails
    }
  }

  private rotateLogIfNeeded(logFile: string) {
    try {
      const filePath = join(this.logDir, logFile);
      const stats = statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);

      if (fileSizeMB > this.maxLogSizeMB) {
        // Rotate: file.log -> file.1.log -> file.2.log -> ... -> deleted
        for (let i = this.maxLogFiles - 1; i > 0; i--) {
          const oldPath = join(this.logDir, `${logFile}.${i}`);
          const newPath = join(this.logDir, `${logFile}.${i + 1}`);
          try {
            if (statSync(oldPath).isFile()) {
              if (i === this.maxLogFiles - 1) {
                unlinkSync(oldPath); // Delete oldest
              } else {
                try { unlinkSync(newPath); } catch { /* target doesn't exist */ }
                renameSync(oldPath, newPath);
              }
            }
          } catch {
            // File doesn't exist, continue
          }
        }

        // Rotate current file to .1
        const rotatePath = join(this.logDir, `${logFile}.1`);
        renameSync(filePath, rotatePath);
      }
    } catch {
      // File doesn't exist yet or rotation failed - will be created on next write
    }
  }

  private queueWrite(logFile: string, content: string) {
    try {
      this.ensureLogDirectory();
      // Check rotation periodically (only on buffer flush would be ideal,
      // but checking here keeps existing behavior)
      this.rotateLogIfNeeded(logFile);
      const buf = getBuffer(logFile);
      buf.push(content);
      // Flush immediately if buffer is large
      if (buf.length >= FLUSH_THRESHOLD) {
        flushAllBuffers(this.logDir);
      }
    } catch {
      // If queueing fails, at least we have stderr
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    // Skip log entries below the configured minimum level
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[getMinLogLevel()]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      prefix: this.prefix,
      message,
      ...context,
    };

    const logLine = JSON.stringify(logEntry);

    // Output to appropriate console method based on log level
    if (level === "error" || level === "warn") {
      console.error(logLine);
    } else {
      console.log(logLine);
    }

    // Queue for async write to rotating log files
    this.queueWrite("combined.log", logLine);

    // Also write errors to dedicated error log
    if (level === "error") {
      this.queueWrite("error.log", logLine);
    }
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext =
      error instanceof Error
        ? {
            error: error.message,
            stack: error.stack,
            name: error.name,
          }
        : { error: String(error) };

    this.log("error", message, { ...errorContext, ...context });
  }

  child(childPrefix: string): Logger {
    return new Logger(
      this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix,
    );
  }
}

// Export singleton instance
export const logger = new Logger("tada");

// Export factory for creating child loggers
export function createLogger(prefix: string): Logger {
  return logger.child(prefix);
}

// Flush on process exit to avoid losing buffered logs
process.on("beforeExit", () => {
  // Synchronous flush for process exit
  for (const [logFile, lines] of writeBuffers.entries()) {
    if (lines.length === 0) continue;
    const batch = lines.splice(0, lines.length);
    const content = batch.join("\n") + "\n";
    try {
      const dbUrl = process.env["DATABASE_URL"] || "";
      const logDir = dbUrl.includes("/data/")
        ? "/data/logs"
        : join(process.cwd(), "data", "logs");
      appendFileSync(join(logDir, logFile), content, "utf8");
    } catch {
      // Best effort
    }
  }
});
