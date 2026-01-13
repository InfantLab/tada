/**
 * Server-side structured logger
 * Outputs JSON logs to both stderr and rotating log files
 */

import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private prefix: string;
  private logDir: string;
  private maxLogSizeMB = 10;
  private maxLogFiles = 5;

  constructor(prefix = "") {
    this.prefix = prefix;
    // Store logs in app/data/logs/ (same location as database)
    this.logDir = join(process.cwd(), "data", "logs");
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    try {
      mkdirSync(this.logDir, { recursive: true });
    } catch {
      // Directory exists or can't be created - fail silently for stderr fallback
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
                unlinkSync(newPath); // Remove target if exists
                appendFileSync(newPath, ""); // Create empty target
                const content = readFileSync(oldPath);
                appendFileSync(newPath, content);
                unlinkSync(oldPath);
              }
            }
          } catch {
            // File doesn't exist, continue
          }
        }

        // Rotate current file to .1
        const rotatePath = join(this.logDir, `${logFile}.1`);
        const content = readFileSync(filePath);
        appendFileSync(rotatePath, content);
        unlinkSync(filePath);
      }
    } catch {
      // File doesn't exist yet or rotation failed - will be created on next write
    }
  }

  private writeToFile(logFile: string, content: string) {
    try {
      const filePath = join(this.logDir, logFile);
      this.rotateLogIfNeeded(logFile);
      appendFileSync(filePath, content + "\n", "utf8");
    } catch (writeError) {
      // If file write fails, at least we have stderr
      console.error("Failed to write to log file:", writeError);
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
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

    // Write to rotating log files
    this.writeToFile("combined.log", logLine);

    // Also write errors to dedicated error log
    if (level === "error") {
      this.writeToFile("error.log", logLine);
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
      this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix
    );
  }
}

// Export singleton instance
export const logger = new Logger("tada");

// Export factory for creating child loggers
export function createLogger(prefix: string): Logger {
  return logger.child(prefix);
}
