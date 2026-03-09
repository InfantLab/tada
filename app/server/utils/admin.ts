/**
 * Admin Utilities
 *
 * Admin status is determined by the ADMIN_USER_IDS environment variable.
 * This keeps things simple — no migration, no role column, no UI.
 */

import type { H3Event } from "h3";
import type { Permission, ApiAuthContext } from "~/types/api";
import { requireAuth, requirePermission } from "~/server/utils/permissions";
import { forbidden } from "~/server/utils/response";

/**
 * Check if a user ID is an admin.
 * Admin status is determined by the ADMIN_USER_IDS env var.
 */
export function isAdmin(userId: string): boolean {
  const adminIds = (process.env["ADMIN_USER_IDS"] || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}

/**
 * Require admin access on an authenticated request.
 * Checks both admin status (env var) and permission scope (API key).
 *
 * For session-based auth: only checks admin status (sessions have all permissions).
 * For API key auth: checks admin status AND that the key has the required permission.
 *
 * @throws 401 if not authenticated
 * @throws 403 if not admin or missing permission
 */
export function requireAdmin(event: H3Event, permission: Permission): void {
  const auth = requireAuth(event);

  if (!isAdmin(auth.userId)) {
    throw createError(forbidden(event, "Admin access required"));
  }

  // For API key auth, also check specific permission
  if (auth.type === "api_key") {
    requirePermission(event, permission);
  }
}
