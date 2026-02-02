/**
 * Permission Checking Utilities
 *
 * Provides functions for checking API permissions on authenticated requests.
 */

import type { H3Event } from "h3";
import type { Permission, ApiAuthContext } from "~/types/api";

/**
 * Check if the authenticated user/API key has a specific permission
 *
 * @param event H3Event with auth context
 * @param requiredPermission The permission to check
 * @returns true if permission is granted, false otherwise
 */
export function hasPermission(
  event: H3Event,
  requiredPermission: Permission,
): boolean {
  const auth = event.context.auth as ApiAuthContext | undefined;

  if (!auth) {
    return false;
  }

  // Session-based auth has all permissions
  if (auth.type === "session") {
    return true;
  }

  // API key auth - check specific permissions
  if (auth.type === "api_key") {
    return auth.permissions.includes(requiredPermission);
  }

  return false;
}

/**
 * Check if the authenticated user/API key has ANY of the specified permissions
 *
 * @param event H3Event with auth context
 * @param requiredPermissions Array of permissions to check
 * @returns true if any permission is granted, false otherwise
 */
export function hasAnyPermission(
  event: H3Event,
  requiredPermissions: Permission[],
): boolean {
  const auth = event.context.auth as ApiAuthContext | undefined;

  if (!auth) {
    return false;
  }

  // Session-based auth has all permissions
  if (auth.type === "session") {
    return true;
  }

  // API key auth - check if any permission matches
  if (auth.type === "api_key") {
    return requiredPermissions.some((perm) => auth.permissions.includes(perm));
  }

  return false;
}

/**
 * Check if the authenticated user/API key has ALL of the specified permissions
 *
 * @param event H3Event with auth context
 * @param requiredPermissions Array of permissions to check
 * @returns true if all permissions are granted, false otherwise
 */
export function hasAllPermissions(
  event: H3Event,
  requiredPermissions: Permission[],
): boolean {
  const auth = event.context.auth as ApiAuthContext | undefined;

  if (!auth) {
    return false;
  }

  // Session-based auth has all permissions
  if (auth.type === "session") {
    return true;
  }

  // API key auth - check if all permissions match
  if (auth.type === "api_key") {
    return requiredPermissions.every((perm) => auth.permissions.includes(perm));
  }

  return false;
}

/**
 * Get the authentication context from the event
 *
 * @param event H3Event with auth context
 * @returns ApiAuthContext if authenticated, undefined otherwise
 */
export function getAuthContext(
  event: H3Event,
): ApiAuthContext | undefined {
  return event.context.auth as ApiAuthContext | undefined;
}

/**
 * Require authentication - throws 401 if not authenticated
 *
 * @param event H3Event to check
 * @returns ApiAuthContext
 * @throws 401 Unauthorized if not authenticated
 */
export function requireAuth(event: H3Event): ApiAuthContext {
  const auth = event.context.auth as ApiAuthContext | undefined;

  if (!auth) {
    throw createError({
      statusCode: 401,
      message: "Authentication required",
    });
  }

  return auth;
}

/**
 * Require specific permission - throws 403 if permission not granted
 *
 * @param event H3Event to check
 * @param requiredPermission Permission to require
 * @throws 401 Unauthorized if not authenticated
 * @throws 403 Forbidden if permission not granted
 */
export function requirePermission(
  event: H3Event,
  requiredPermission: Permission,
): void {
  const auth = requireAuth(event);

  // Session-based auth has all permissions
  if (auth.type === "session") {
    return;
  }

  // API key auth - check specific permission
  if (auth.type === "api_key") {
    if (!auth.permissions.includes(requiredPermission)) {
      throw createError({
        statusCode: 403,
        message: `Permission denied: ${requiredPermission} required`,
      });
    }
    return;
  }

  throw createError({
    statusCode: 403,
    message: "Permission denied",
  });
}

/**
 * Require ANY of the specified permissions - throws 403 if none granted
 *
 * @param event H3Event to check
 * @param requiredPermissions Array of permissions (any will do)
 * @throws 401 Unauthorized if not authenticated
 * @throws 403 Forbidden if no permissions granted
 */
export function requireAnyPermission(
  event: H3Event,
  requiredPermissions: Permission[],
): void {
  const auth = requireAuth(event);

  // Session-based auth has all permissions
  if (auth.type === "session") {
    return;
  }

  // API key auth - check if any permission matches
  if (auth.type === "api_key") {
    if (!requiredPermissions.some((perm) => auth.permissions.includes(perm))) {
      throw createError({
        statusCode: 403,
        message: `Permission denied: one of [${requiredPermissions.join(", ")}] required`,
      });
    }
    return;
  }

  throw createError({
    statusCode: 403,
    message: "Permission denied",
  });
}
