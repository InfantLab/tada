/**
 * Safe Database Operations
 *
 * Wraps database operations with retry logic and error recovery
 * for handling transient SQLite issues (BUSY, locked, etc.)
 */

import { retryDbOperation } from "./manager";
import { createLogger } from "~/utils/logger";
import type { Database } from "./index";

const logger = createLogger("db:operations");

/**
 * Execute a database query with automatic retry on transient errors
 *
 * Usage:
 *   const result = await withRetry(() => db.select().from(entries))
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context?: string,
): Promise<T> {
  try {
    return await retryDbOperation(operation);
  } catch (err) {
    logger.error(
      `Database operation failed after retries${context ? `: ${context}` : ""}`,
      err as Error,
    );

    // Re-throw with context
    throw err;
  }
}

/**
 * Execute a database transaction with retry logic
 *
 * Usage:
 *   await withTransaction(db, async (tx) => {
 *     await tx.insert(entries).values(data);
 *   })
 */
export async function withTransaction<T>(
  db: Database,
  operation: Parameters<Database["transaction"]>[0],
  context?: string,
): Promise<T> {
  return withRetry(async () => {
    return (await db.transaction(operation)) as T;
  }, context);
}

/**
 * Safe database write operation with conflict handling
 * Returns null on failure instead of throwing
 */
export async function safeWrite<T>(
  operation: () => Promise<T>,
  context?: string,
): Promise<T | null> {
  try {
    return await withRetry(operation, context);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(
      `Safe write failed${context ? ` (${context})` : ""}: ${errorMsg}`,
      err as Error,
    );
    return null;
  }
}

/**
 * Safe database read operation
 * Returns empty array on failure instead of throwing
 */
export async function safeRead<T>(
  operation: () => Promise<T[]>,
  context?: string,
): Promise<T[]> {
  try {
    return await withRetry(operation, context);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(
      `Safe read failed${context ? ` (${context})` : ""}: ${errorMsg}`,
      err as Error,
    );
    return [];
  }
}
