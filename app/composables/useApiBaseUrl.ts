/**
 * Read/write the user-configurable API base URL (Phase 2.4 server picker).
 *
 * Static Capacitor builds bake `NUXT_PUBLIC_API_BASE_URL=https://tada.living`
 * into `runtimeConfig.public.apiBaseUrl`. Self-hosters can override that to
 * point at their own server. The override lives in localStorage and is
 * applied at boot by `plugins/api-client.client.ts`; changing it here is a
 * persisted preference — callers should prompt for a reload (or call
 * `applyAndReload()`) so existing in-memory `$fetch` instances pick it up.
 */

const STORAGE_KEY = "tada.apiBaseUrl";

export function useApiBaseUrl() {
  const config = useRuntimeConfig();
  const buildTime = String(config.public.apiBaseUrl ?? "");

  function readOverride(): string {
    if (typeof localStorage === "undefined") return "";
    try {
      return localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
    } catch {
      return "";
    }
  }

  function current(): string {
    const o = readOverride();
    return o || buildTime;
  }

  function setOverride(url: string): void {
    if (typeof localStorage === "undefined") return;
    const trimmed = url.trim().replace(/\/+$/, "");
    if (trimmed === buildTime || trimmed === "") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, trimmed);
    }
  }

  async function validate(url: string): Promise<boolean> {
    const base = url.trim().replace(/\/+$/, "");
    if (!/^https?:\/\/[^/\s]+/.test(base)) return false;
    try {
      const res = await fetch(`${base}/api/v1/health`, {
        method: "GET",
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  function applyAndReload(): void {
    if (typeof window === "undefined") return;
    window.location.reload();
  }

  return { buildTime, current, readOverride, setOverride, validate, applyAndReload };
}
