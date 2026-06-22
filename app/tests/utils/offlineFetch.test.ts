/**
 * Vitest coverage for the offline-aware $fetch wrapper (offline Tier 1b/2):
 * cached GETs resolve instead of throwing on failure, and failed entry
 * creation POSTs get queued instead of silently dropping data.
 */

import "fake-indexeddb/auto";
import { resetFakeIndexedDb } from "../helpers/resetFakeIndexedDb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type OfflineFetchModule = typeof import("~/utils/offlineFetch");
type CacheModule = typeof import("~/utils/apiCache");
type WriteQueueModule = typeof import("~/utils/writeQueue");

async function loadModules() {
  vi.resetModules();
  const [offlineFetch, apiCache, writeQueue] = await Promise.all([
    import("~/utils/offlineFetch") as Promise<OfflineFetchModule>,
    import("~/utils/apiCache") as Promise<CacheModule>,
    import("~/utils/writeQueue") as Promise<WriteQueueModule>,
  ]);
  return { offlineFetch, apiCache, writeQueue };
}

function networkError(): Error {
  // Mirrors a raw fetch() rejection — no `.response` property, exactly
  // what ofetch throws when the request never reaches a server.
  return new Error("Failed to fetch");
}

function httpError(status: number): Error {
  const err = new Error(`Request failed with status ${status}`) as Error & {
    response?: { status: number };
  };
  err.response = { status };
  return err;
}

beforeEach(() => {
  resetFakeIndexedDb();
});

afterEach(() => {
  resetFakeIndexedDb();
});

describe("createOfflineAwareFetch", () => {
  it("returns the live result when the underlying fetch succeeds", async () => {
    const { offlineFetch } = await loadModules();
    const baseFetch = vi.fn().mockResolvedValue({ entries: [] });
    const fetcher = offlineFetch.createOfflineAwareFetch(baseFetch);

    const result = await fetcher("/api/entries", { method: "GET" });

    expect(result).toEqual({ entries: [] });
    expect(baseFetch).toHaveBeenCalledOnce();
  });

  it("resolves a cached GET instead of throwing on a network failure", async () => {
    const { offlineFetch, apiCache } = await loadModules();
    await apiCache.put("/api/entries", { entries: [{ id: "a" }] }, 200);

    const baseFetch = vi.fn().mockRejectedValue(networkError());
    const fetcher = offlineFetch.createOfflineAwareFetch(baseFetch);

    const result = await fetcher("/api/entries", { method: "GET" });

    expect(result).toEqual({ entries: [{ id: "a" }] });
  });

  it("rethrows a cacheable GET failure when there is no cache hit", async () => {
    const { offlineFetch } = await loadModules();
    const baseFetch = vi.fn().mockRejectedValue(networkError());
    const fetcher = offlineFetch.createOfflineAwareFetch(baseFetch);

    await expect(fetcher("/api/entries", { method: "GET" })).rejects.toThrow(
      "Failed to fetch",
    );
  });

  it("rethrows a non-cacheable GET failure (e.g. /api/auth/session) without consulting the cache", async () => {
    const { offlineFetch, apiCache } = await loadModules();
    await apiCache.put("/api/auth/session", { user: { id: "1" } }, 200);
    const baseFetch = vi.fn().mockRejectedValue(networkError());
    const fetcher = offlineFetch.createOfflineAwareFetch(baseFetch);

    await expect(
      fetcher("/api/auth/session", { method: "GET" }),
    ).rejects.toThrow("Failed to fetch");
  });

  it("queues a POST /api/entries on network failure and throws OfflineWriteError", async () => {
    const { offlineFetch, writeQueue } = await loadModules();
    const baseFetch = vi.fn().mockRejectedValue(networkError());
    const fetcher = offlineFetch.createOfflineAwareFetch(baseFetch);
    const body = { type: "timed", name: "Meditation" };

    await expect(
      fetcher("/api/entries", { method: "POST", body }),
    ).rejects.toMatchObject({ code: "OFFLINE_WRITE" });

    const pending = await writeQueue.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.body).toEqual(body);
  });

  it("does not queue a POST that fails with a real (non-network) error", async () => {
    const { offlineFetch, writeQueue } = await loadModules();
    const baseFetch = vi.fn().mockRejectedValue(httpError(400));
    const fetcher = offlineFetch.createOfflineAwareFetch(baseFetch);

    await expect(
      fetcher("/api/entries", { method: "POST", body: {} }),
    ).rejects.toThrow();

    expect(await writeQueue.listPending()).toHaveLength(0);
  });

  it("does not queue PATCH/DELETE on network failure (scoped to entry creation only)", async () => {
    const { offlineFetch, writeQueue } = await loadModules();
    const baseFetch = vi.fn().mockRejectedValue(networkError());
    const fetcher = offlineFetch.createOfflineAwareFetch(baseFetch);

    await expect(
      fetcher("/api/entries/abc", { method: "PATCH", body: {} }),
    ).rejects.toThrow("Failed to fetch");
    await expect(
      fetcher("/api/entries/abc", { method: "DELETE" }),
    ).rejects.toThrow("Failed to fetch");

    expect(await writeQueue.listPending()).toHaveLength(0);
  });
});

describe("flushQueue", () => {
  it("replays queued writes in order and removes them on success", async () => {
    const { offlineFetch, writeQueue } = await loadModules();
    await writeQueue.enqueue({ url: "/api/entries", method: "POST", body: { name: "first" } });
    await writeQueue.enqueue({ url: "/api/entries", method: "POST", body: { name: "second" } });

    const calls: unknown[] = [];
    const baseFetch = vi.fn().mockImplementation(async (_url, options) => {
      calls.push(options.body);
      return { id: "synced" };
    });

    const result = await offlineFetch.flushQueue(baseFetch);

    expect(result).toEqual({ synced: 2, dropped: 0 });
    expect(calls).toEqual([{ name: "first" }, { name: "second" }]);
    expect(await writeQueue.listPending()).toHaveLength(0);
  });

  it("stops on the first network failure and leaves the rest queued", async () => {
    const { offlineFetch, writeQueue } = await loadModules();
    await writeQueue.enqueue({ url: "/api/entries", method: "POST", body: { name: "first" } });
    await writeQueue.enqueue({ url: "/api/entries", method: "POST", body: { name: "second" } });

    const baseFetch = vi.fn().mockRejectedValue(networkError());

    const result = await offlineFetch.flushQueue(baseFetch);

    expect(result).toEqual({ synced: 0, dropped: 0 });
    expect(await writeQueue.listPending()).toHaveLength(2);
  });

  it("drops an item that fails with a real error on replay instead of jamming the queue", async () => {
    const { offlineFetch, writeQueue } = await loadModules();
    await writeQueue.enqueue({ url: "/api/entries", method: "POST", body: { name: "bad" } });
    await writeQueue.enqueue({ url: "/api/entries", method: "POST", body: { name: "good" } });

    const baseFetch = vi
      .fn()
      .mockRejectedValueOnce(httpError(400))
      .mockResolvedValueOnce({ id: "synced" });

    const result = await offlineFetch.flushQueue(baseFetch);

    expect(result).toEqual({ synced: 1, dropped: 1 });
    expect(await writeQueue.listPending()).toHaveLength(0);
  });

  it("is a no-op when the queue is empty", async () => {
    const { offlineFetch } = await loadModules();
    const baseFetch = vi.fn();

    const result = await offlineFetch.flushQueue(baseFetch);

    expect(result).toEqual({ synced: 0, dropped: 0 });
    expect(baseFetch).not.toHaveBeenCalled();
  });
});
