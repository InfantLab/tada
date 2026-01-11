/**
 * Global auth middleware
 * Redirects unauthenticated users to login page
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Allow access to login page
  if (to.path === "/login") {
    return;
  }

  // Check if user is authenticated
  try {
    const response = await $fetch<{
      user: { id: string; username: string; timezone: string } | null;
    }>("/api/auth/session");
    if (!response.user) {
      return navigateTo("/login");
    }
  } catch (error) {
    // If session check fails, redirect to login
    console.error("Auth middleware error:", error);
    return navigateTo("/login");
  }
});
