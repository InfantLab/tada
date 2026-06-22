/**
 * Global auth middleware
 * Redirects unauthenticated users to login page
 * Allows public pages (login, landing, legal, blog)
 */

import { isNetworkError } from "~/utils/networkError";
import { LAST_AUTHENTICATED_KEY } from "~/utils/authState";

const publicPaths = ["/", "/login", "/register", "/privacy", "/terms", "/dpa", "/help", "/feedback", "/verify-email", "/debug-auth"];
const publicPrefixes = ["/blog", "/api/v1"];

export default defineNuxtRouteMiddleware(async (to) => {
  // Allow access to public pages
  if (publicPaths.includes(to.path)) {
    return;
  }

  // Allow access to public path prefixes (e.g., /blog/*)
  if (publicPrefixes.some((prefix) => to.path.startsWith(prefix))) {
    return;
  }

  // Check if user is authenticated
  try {
    const response = await $fetch<{
      user: { id: string; username: string; timezone: string } | null;
    }>("/api/auth/session");
    if (!response.user) {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(LAST_AUTHENTICATED_KEY, "false");
      }
      return navigateTo(`/login?redirect=${encodeURIComponent(to.path)}`);
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LAST_AUTHENTICATED_KEY, "true");
    }
  } catch (error) {
    // A network error (offline) doesn't mean the user logged out — trust
    // the last confirmed auth state instead of bouncing to /login, which
    // is itself unreachable offline. Only a real "not logged in" response
    // (handled above) or no prior signal at all falls back to redirecting.
    if (
      isNetworkError(error) &&
      typeof localStorage !== "undefined" &&
      localStorage.getItem(LAST_AUTHENTICATED_KEY) === "true"
    ) {
      return;
    }
    console.error("Auth middleware error:", error);
    return navigateTo(`/login?redirect=${encodeURIComponent(to.path)}`);
  }
});
