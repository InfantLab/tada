/**
 * SQLite Database Management Utilities
 *
 * Provides robust database initialization, health checks, and recovery mechanisms
 * for handling SQLite connection issues in development and production.
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createLogger } from "~/utils/logger";

const logger = createLogger("db:manager");

// Use a generic type to avoid circular dependency with index.ts
type DatabaseLike = {
  // Drizzle ORM database interface
  execute?: (sql: string) => Promise<unknown>;
  $client?: {
    execute: (sql: string) => Promise<unknown>;
  };
  close?: () => Promise<void>;
};

/**
 * Ensure database directory exists
 */
export function ensureDbDirectory(dbPath: string): void {
  try {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      logger.info(`Creating database directory: ${dir}`);
      mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    logger.error("Failed to create database directory", err as Error);
    throw err;
  }
}

/**
 * Check if database file exists
 */
export function dbExists(dbPath: string): boolean {
  // Remove file: prefix if present
  const cleanPath = dbPath.replace(/^file:/, "");
  return existsSync(cleanPath);
}

/**
 * Database health check
 * Returns true if database is accessible and responsive
 */
export async function checkDbHealth(db: DatabaseLike): Promise<boolean> {
  try {
    // Simple query to test connection
    // Try direct execute first, then $client.execute
    if (db.execute) {
      await db.execute("SELECT 1");
    } else if (db.$client?.execute) {
      await db.$client.execute("SELECT 1");
    } else {
      // If neither method exists, assume it's healthy (can't test)
      return true;
    }
    return true;
  } catch (err) {
    logger.error("Database health check failed", err as Error);
    return false;
  }
}

/**
 * Retry database operation with exponential backoff
 */
export async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 100,
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;

      // Check if it's a transient error (SQLITE_BUSY, locked, etc)
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isTransient = /SQLITE_BUSY|database is locked|EINVAL/.test(
        errorMsg,
      );

      if (!isTransient || attempt === maxRetries) {
        throw err;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(
        `Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`,
        {
          error: errorMsg,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Safe database initialization with retry logic
 */
export async function initializeDatabase(
  dbPath: string,
  db: DatabaseLike,
): Promise<void> {
  try {
    // Ensure directory exists
    ensureDbDirectory(dbPath.replace(/^file:/, ""));

    // Test connection with retry
    await retryDbOperation(async () => {
      const healthy = await checkDbHealth(db);
      if (!healthy) {
        throw new Error("Database health check failed");
      }
    });

    logger.info("Database initialized successfully");
  } catch (err) {
    logger.error("Failed to initialize database", err as Error);
    throw err;
  }
}

/**
 * Graceful database shutdown
 */
export async function shutdownDatabase(db: DatabaseLike): Promise<void> {
  try {
    logger.info("Shutting down database connection");
    // Allow pending operations to complete
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Close connection if method exists
    if (typeof db.close === "function") {
      await db.close();
    }
    logger.info("Database connection closed");
  } catch (err) {
    logger.error("Error during database shutdown", err as Error);
  }
}
