/**
 * Global auth middleware
 * Redirects unauthenticated users to login page
 * Allows public pages (login, landing, legal, blog)
 */

const publicPaths = ["/", "/login", "/register", "/privacy", "/terms", "/dpa", "/help", "/feedback", "/verify-email"];
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
      return navigateTo(`/login?redirect=${encodeURIComponent(to.path)}`);
    }
  } catch (error) {
    // If session check fails, redirect to login
    console.error("Auth middleware error:", error);
    return navigateTo(`/login?redirect=${encodeURIComponent(to.path)}`);
  }
});
