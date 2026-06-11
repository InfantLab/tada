import {
  isCacheable,
  get as cacheGet,
  put as cachePut,
  invalidatePrefix,
  stripOrigin,
} from "~/utils/apiCache";

export class OfflineWriteError extends Error {
  code = "OFFLINE_WRITE" as const;
  constructor(method: string, path: string) {
    super(`Offline — ${method} ${path} will need to wait for connection.`);
  }
}

function normaliseBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (!/^https?:\/\/[^/\s]+/.test(trimmed)) return "";
  return trimmed;
}

function isMutation(method: string): boolean {
  const m = method.toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

export default defineNuxtPlugin(() => {
  // Wrap everything so a plugin crash never blocks Vue hydration.
  try {
    const config = useRuntimeConfig();
    const buildTimeUrl = normaliseBaseUrl(String(config.public.apiBaseUrl ?? ""));
    const isCapacitorWebView =
      typeof window !== "undefined" &&
      window.location.hostname === "app.tada.living";
    const nativeFallback = isCapacitorWebView ? "https://tada.living" : "";
    const baseURL = buildTimeUrl || nativeFallback;

    console.log("[TADA] api-client plugin init, baseURL:", baseURL || "(none)");

    (globalThis as unknown as { $fetch: typeof $fetch }).$fetch = $fetch.create({
      ...(baseURL ? { baseURL } : {}),
      credentials: baseURL ? "include" : "same-origin",

      async onResponse({ request, response, options }) {
        try {
          const method = String(options.method ?? "GET");
          const url = typeof request === "string" ? request : String(request);
          if (response.ok && isCacheable(url, method)) {
            await cachePut(url, response._data, response.status).catch(() => {});
          }
          if (response.ok && isMutation(method)) {
            const path = stripOrigin(url).split("?")[0] ?? "";
            if (path.startsWith("/api/")) void invalidatePrefix(path).catch(() => {});
          }
        } catch {
          // Cache failures must never break the response path.
        }
      },

      async onResponseError({ request, response, options }) {
        try {
          const method = String(options.method ?? "GET");
          const url = typeof request === "string" ? request : String(request);
          if (response.status >= 500 && isCacheable(url, method)) {
            const hit = await cacheGet(url);
            if (hit) (response as { _data: unknown })._data = hit.body;
          }
        } catch {
          // Cache failures must never break the error path.
        }
      },
    });

    console.log("[TADA] api-client plugin ready");
  } catch (err) {
    console.error("[TADA] api-client plugin init failed:", err);
  }
});
