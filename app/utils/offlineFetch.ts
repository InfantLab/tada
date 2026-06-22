/**
 * Offline-aware wrapping for $fetch — extracted from the api-client plugin
 * so the core decision logic (resolve cached GETs, queue failed entry
 * creation) is unit-testable without spinning up the full Nuxt plugin
 * lifecycle.
 *
 * ofetch always throws on a failed request — both on a true network
 * failure (no response at all) and on an HTTP error response. Hooks like
 * onResponseError can't rescue the call; they can only observe it before
 * the throw. So this has to wrap the whole call, not live inside a hook.
 */
import {
  isCacheable,
  get as cacheGet,
  invalidatePrefix,
  stripOrigin,
} from "~/utils/apiCache";
import { enqueue, listPending, remove as removeQueued } from "~/utils/writeQueue";
import { isNetworkError } from "~/utils/networkError";
import { OfflineWriteError } from "~/utils/offlineWriteError";

export const QUEUEABLE_PATH = "/api/entries";

type RawFetch = (request: unknown, options?: { method?: string; body?: unknown }) => Promise<unknown>;

export function createOfflineAwareFetch(baseFetch: RawFetch) {
  return async function offlineAwareFetch(
    request: unknown,
    options?: { method?: string; body?: unknown },
  ): Promise<unknown> {
    const method = String(options?.method ?? "GET");
    const url = typeof request === "string" ? request : String(request);

    try {
      return await baseFetch(request, options);
    } catch (err) {
      if (isCacheable(url, method)) {
        const hit = await cacheGet(url);
        if (hit) return hit.body;
      }

      const path = stripOrigin(url).split("?")[0] ?? "";
      if (method === "POST" && path === QUEUEABLE_PATH && isNetworkError(err)) {
        await enqueue({ url, method, body: options?.body });
        throw new OfflineWriteError(method, path);
      }

      throw err;
    }
  };
}

export type FlushResult = { synced: number; dropped: number };

export async function flushQueue(baseFetch: RawFetch): Promise<FlushResult> {
  const pending = await listPending();
  let synced = 0;
  let dropped = 0;

  for (const item of pending) {
    try {
      await baseFetch(item.url, { method: item.method, body: item.body });
      await removeQueued(item.id);
      synced++;
    } catch (err) {
      // Still offline — stop and leave the rest queued rather than risk
      // reordering on a partial retry.
      if (isNetworkError(err)) break;
      // A real error on replay (e.g. the entry is now invalid) — drop it
      // so the queue doesn't jam forever, but don't pretend it synced.
      await removeQueued(item.id);
      dropped++;
    }
  }

  if (synced > 0) void invalidatePrefix(QUEUEABLE_PATH).catch(() => {});

  return { synced, dropped };
}
