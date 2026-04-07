/**
 * Ourmoji feature loggers.
 *
 * Centralized logger factories so every Ourmoji module logs under a
 * consistent namespace prefix.
 */

import { createLogger } from "~/server/utils/logger";

export const ourmojiLogger = createLogger("ourmoji");
export const ourmojiApiLogger = createLogger("ourmoji:api");
export const ourmojiServiceLogger = createLogger("ourmoji:service");
export const ourmojiSchedulerLogger = createLogger("ourmoji:scheduler");

export function ourmojiChildLogger(scope: string) {
  return createLogger(`ourmoji:${scope}`);
}
