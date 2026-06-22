/**
 * Vitest coverage for the IndexedDB pending-write queue (offline Tier 2).
 *
 * Same pattern as apiCache.test.ts: fake-indexeddb installed up front,
 * module re-imported per test via vi.resetModules() so each test gets a
 * fresh dbPromise.
 */

import "fake-indexeddb/auto";
import { resetFakeIndexedDb } from "../helpers/resetFakeIndexedDb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type WriteQueueModule = typeof import("~/utils/writeQueue");

async function loadQueue(): Promise<WriteQueueModule> {
  vi.resetModules();
  return import("~/utils/writeQueue");
}

beforeEach(() => {
  resetFakeIndexedDb();
});

afterEach(() => {
  resetFakeIndexedDb();
});

describe("enqueue/listPending/remove", () => {
  it("stores a queued write and lists it back", async () => {
    const queue = await loadQueue();
    await queue.enqueue({
      url: "/api/entries",
      method: "POST",
      body: { type: "timed", name: "Meditation" },
    });

    const pending = await queue.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.url).toBe("/api/entries");
    expect(pending[0]?.method).toBe("POST");
    expect(pending[0]?.body).toEqual({ type: "timed", name: "Meditation" });
    expect(pending[0]?.id).toBeTruthy();
    expect(pending[0]?.createdAt).toBeGreaterThan(0);
  });

  it("preserves FIFO order across multiple writes", async () => {
    const queue = await loadQueue();
    await queue.enqueue({ url: "/api/entries", method: "POST", body: { name: "first" } });
    await queue.enqueue({ url: "/api/entries", method: "POST", body: { name: "second" } });
    await queue.enqueue({ url: "/api/entries", method: "POST", body: { name: "third" } });

    const pending = await queue.listPending();
    expect(pending.map((p) => (p.body as { name: string }).name)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("removes a queued write by id", async () => {
    const queue = await loadQueue();
    await queue.enqueue({ url: "/api/entries", method: "POST", body: {} });
    const [item] = await queue.listPending();
    expect(item).toBeDefined();

    await queue.remove(item!.id);

    expect(await queue.listPending()).toHaveLength(0);
  });

  it("returns an empty list when nothing is queued", async () => {
    const queue = await loadQueue();
    expect(await queue.listPending()).toEqual([]);
  });
});
