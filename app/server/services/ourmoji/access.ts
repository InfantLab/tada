/**
 * Ourmoji feature-flag access guard.
 *
 * The Ourmoji module is gated by the per-user `enabled_modules.ourmoji`
 * preference flag. This helper centralises the check so endpoints,
 * services, and the scheduler all agree on visibility.
 */

import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { userPreferences } from "~/server/db/schema";
import { OURMOJI_MODULE_FLAG } from "~/utils/ourmoji/constants";

/**
 * Returns true if the given user has Ourmoji enabled in their preferences.
 * Users with no preferences row are treated as not enabled (default off).
 */
export async function isOurmojiEnabledForUser(
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ enabledModules: userPreferences.enabledModules })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  const flags = rows[0]?.enabledModules ?? null;
  if (!flags || typeof flags !== "object") return false;
  return flags[OURMOJI_MODULE_FLAG] === true;
}

/**
 * Filter a list of user ids to those that have the Ourmoji flag enabled.
 * Used by the scheduler sweep to skip disabled participants quickly.
 */
export async function filterOurmojiEnabledUsers(
  userIds: string[],
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await db
    .select({
      userId: userPreferences.userId,
      enabledModules: userPreferences.enabledModules,
    })
    .from(userPreferences);

  const enabled = new Set<string>();
  for (const row of rows) {
    if (
      row.enabledModules &&
      typeof row.enabledModules === "object" &&
      (row.enabledModules as Record<string, unknown>)[OURMOJI_MODULE_FLAG] === true
    ) {
      enabled.add(row.userId);
    }
  }
  return userIds.filter((id) => enabled.has(id));
}
