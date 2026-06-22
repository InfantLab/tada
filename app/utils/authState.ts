/**
 * localStorage key recording the last confirmed (network-backed) auth
 * check result. Used to avoid treating a connectivity failure as "logged
 * out" — see auth.global.ts and pages/index.vue.
 */
export const LAST_AUTHENTICATED_KEY = "tada:lastAuthenticated";
