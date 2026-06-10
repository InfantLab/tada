/**
 * Configures the global `$fetch` with a runtime API base URL and the
 * IndexedDB read-cache + mutation-invalidation interceptors.
 *
 * In SSR/PWA, `apiBaseUrl` is empty and same-origin relative paths work
 * (`$fetch('/api/v1/entries')` hits the local Nitro server). In a static
 * Capacitor build the bundle is served from `capacitor://localhost` (or
 * similar) and relative `/api` paths would 404, so we prefix them with the
 * cloud (or user-configured) backend.
 *
 * Resolution order for the base URL, highest priority first:
 *   1. Per-user override stored in localStorage (Phase 2.4 server picker)
 *   2. Build-time `NUXT_PUBLIC_API_BASE_URL` baked into runtime config
 *   3. Native fallback: https://tada.living when Capacitor.isNativePlatform()
 *   4. No prefix — relative URLs resolve against the page origin (SSR/PWA)
 *
 * Offline cache behaviour (Phase 2.5):
 *   - Every successful /api/* GET response is written to IndexedDB.
 *   - When a /api/* GET fails (offline, network error), the cache layer
 *     replays the last-seen body so the UI keeps working.
 *   - Every successful /api/* mutation invalidates cached entries whose
 *     path prefix matches the mutated resource.
 *   - When a mutation fails offline, the caller gets an `OfflineWriteError`
 *     with `code === "OFFLINE_WRITE"` that the UI surfaces as a toast.
 *
 * Phase 2.3 + 2.5 of v0.7.0. See docs/plans/native-android.md.
 */

import { Capacitor } from "@capacitor/core";
import {
  isCacheable,
  get as cacheGet,
  put as cachePut,
  invalidatePrefix,
  stripOrigin,
} from "~/utils/apiCache";

const STORAGE_KEY = "tada.apiBaseUrl";

export class OfflineWriteError extends Error {
  code = "OFFLINE_WRITE" as const;
  constructor(method: string, path: string) {
    super(`Offline — ${method} ${path} will need to wait for connection.`);
  }
}

function readUserOverride(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function normaliseBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (!/^https?:\/\/[^/\s]+/.test(trimmed)) return "";
  return trimmed;
}

function isLikelyOfflineError(err: unknown): boolean {
  // ofetch wraps fetch errors; the original is usually on `cause` or the
  // top-level message contains "Failed to fetch" / "Network request failed".
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const e = err as { message?: string; cause?: { message?: string } } | null;
  const msg = (e?.message ?? "") + " " + (e?.cause?.message ?? "");
  return /Failed to fetch|NetworkError|Network request failed|TypeError: fetch/i.test(
    msg,
  );
}

function isMutation(method: string): boolean {
  const m = method.toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

// The default cloud backend. Used as a fallback when running in Capacitor
// native and no build-time or user-configured URL is available. This means
// the env var baking step (NUXT_PUBLIC_API_BASE_URL) is not load-bearing —
// the native context alone is enough to know which server to talk to.
const NATIVE_DEFAULT_URL = "https://tada.living";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  // Normalise each candidate independently so an invalid baked-in value
  // (e.g. a literal un-expanded bash expression) doesn't block the fallback.
  const userOverrideUrl = normaliseBaseUrl(readUserOverride());
  const buildTimeUrl = normaliseBaseUrl(String(config.public.apiBaseUrl ?? ""));
  const nativeFallback = Capacitor.isNativePlatform() ? NATIVE_DEFAULT_URL : "";
  const baseURL = userOverrideUrl || buildTimeUrl || nativeFallback;

  const configured = $fetch.create({
    ...(baseURL ? { baseURL } : {}),
    // Capacitor WebView origin is app.tada.living; API origin is tada.living.
    // Same-site but cross-origin, so fetch needs credentials:'include' for
    // the session cookie to ride along (Phase 3.2). On the PWA, baseURL is
    // empty and this is a same-origin call where credentials default to
    // 'same-origin' anyway.
    credentials: baseURL ? "include" : "same-origin",

    async onResponse({ request, response, options }) {
      const method = String(options.method ?? "GET");
      const url = typeof request === "string" ? request : String(request);
      if (response.ok && isCacheable(url, method)) {
        // Clone so we don't disturb the caller's view of the body.
        try {
          await cachePut(url, response._data, response.status);
        } catch {
          // Cache write failures must never break the response path.
        }
      }
      if (response.ok && isMutation(method)) {
        const path = stripOrigin(url).split("?")[0] ?? "";
        if (path.startsWith("/api/")) await invalidatePrefix(path);
      }
    },

    async onResponseError({ request, response, options }) {
      const method = String(options.method ?? "GET");
      const url = typeof request === "string" ? request : String(request);
      // For 5xx we can also try the cache for GETs. For 4xx we should let
      // the error propagate — it's a real auth/validation problem, not a
      // network issue, and a stale cache hit would mask it.
      if (response.status >= 500 && isCacheable(url, method)) {
        const hit = await cacheGet(url);
        if (hit) {
          // Mutate response so downstream consumers see the cached body.
          // ofetch will still throw because the status is non-2xx, so the
          // caller has to catch and look at the data — for the in-app GETs
          // we go through onRequestError below for actual offline cases.
          (response as { _data: unknown })._data = hit.body;
        }
      }
    },
  });

  // ofetch doesn't let us swap the body of a *rejected* response via
  // onResponseError easily (the throw still happens). For offline GETs we
  // wrap the configured fetch in a final layer that catches network errors
  // and returns the cached body directly.
  const wrapped = ((request: unknown, opts?: Record<string, unknown>) => {
    const method = String((opts?.["method"] as string | undefined) ?? "GET");
    const url = typeof request === "string" ? request : String(request);

    if (isMutation(method) && typeof navigator !== "undefined" && navigator.onLine === false) {
      const path = stripOrigin(url);
      try {
        useToast().warning(
          "You're offline — couldn't save. Try again when you reconnect.",
        );
      } catch {
        // If useToast isn't available yet (e.g. SSR fallback), don't block
        // the rejection.
      }
      return Promise.reject(new OfflineWriteError(method, path));
    }

    return configured(request as Parameters<typeof configured>[0], opts).catch(
      async (err: unknown) => {
        if (!isCacheable(url, method)) throw err;
        if (!isLikelyOfflineError(err)) throw err;
        const hit = await cacheGet(url);
        if (!hit) throw err;
        return hit.body;
      },
    );
  }) as typeof $fetch;

  // Carry the helpers from the configured instance so callers that use
  // `$fetch.raw(...)` or `$fetch.create(...)` still work.
  Object.assign(wrapped, {
    raw: configured.raw.bind(configured),
    create: configured.create.bind(configured),
  });

  (globalThis as unknown as { $fetch: typeof $fetch }).$fetch = wrapped;
});
