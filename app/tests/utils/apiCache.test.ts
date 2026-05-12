/**
 * Phase 2.5d — vitest coverage for the IndexedDB read-cache utility.
 *
 * Uses `fake-indexeddb/auto` to install an in-process IndexedDB before the
 * module under test is loaded. We re-import the module per test via
 * `vi.resetModules()` so each test gets a fresh `dbPromise` and the FDB
 * factory reset is honoured.
 */

import "fake-indexeddb/auto";
import { resetFakeIndexedDb } from "../helpers/resetFakeIndexedDb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CacheModule = typeof import("~/utils/apiCache");

async function loadCache(): Promise<CacheModule> {
  vi.resetModules();
  return import("~/utils/apiCache");
}

beforeEach(() => {
  resetFakeIndexedDb();
});

afterEach(() => {
  resetFakeIndexedDb();
});

describe("stripOrigin", () => {
  it("returns relative paths untouched", async () => {
    const { stripOrigin } = await loadCache();
    expect(stripOrigin("/api/v1/entries")).toBe("/api/v1/entries");
    expect(stripOrigin("/api/v1/entries?limit=20")).toBe(
      "/api/v1/entries?limit=20",
    );
  });

  it("strips the origin from absolute URLs", async () => {
    const { stripOrigin } = await loadCache();
    expect(stripOrigin("https://tada.living/api/v1/entries")).toBe(
      "/api/v1/entries",
    );
    expect(stripOrigin("https://tada.living/api/v1/entries?cursor=x")).toBe(
      "/api/v1/entries?cursor=x",
    );
  });
});

describe("isCacheable", () => {
  it("accepts GETs to /api/*", async () => {
    const { isCacheable } = await loadCache();
    expect(isCacheable("/api/v1/entries", "GET")).toBe(true);
    expect(isCacheable("https://tada.living/api/v1/entries", "GET")).toBe(true);
  });

  it("rejects non-GET methods", async () => {
    const { isCacheable } = await loadCache();
    expect(isCacheable("/api/v1/entries", "POST")).toBe(false);
    expect(isCacheable("/api/v1/entries", "PUT")).toBe(false);
    expect(isCacheable("/api/v1/entries", "DELETE")).toBe(false);
    expect(isCacheable("/api/v1/entries", "PATCH")).toBe(false);
  });

  it("rejects non-/api routes", async () => {
    const { isCacheable } = await loadCache();
    expect(isCacheable("/blog", "GET")).toBe(false);
    expect(isCacheable("/", "GET")).toBe(false);
  });

  it("skips sensitive or live-state endpoints", async () => {
    const { isCacheable } = await loadCache();
    expect(isCacheable("/api/auth/login", "GET")).toBe(false);
    expect(isCacheable("/api/v1/health", "GET")).toBe(false);
    expect(isCacheable("/api/openapi.json", "GET")).toBe(false);
    expect(isCacheable("/api/push/vapid-key", "GET")).toBe(false);
  });
});

describe("put/get round trip", () => {
  it("stores then reads a successful GET body", async () => {
    const cache = await loadCache();
    const url = "/api/v1/entries";
    const body = { entries: [{ id: "a" }] };

    const ok = await cache.put(url, body, 200);
    expect(ok).toBe(true);

    const hit = await cache.get(url);
    expect(hit).not.toBeNull();
    expect(hit?.body).toEqual(body);
    expect(hit?.status).toBe(200);
  });

  it("refuses to cache non-2xx responses", async () => {
    const cache = await loadCache();
    expect(await cache.put("/api/v1/entries", {}, 500)).toBe(false);
    expect(await cache.put("/api/v1/entries", {}, 404)).toBe(false);
  });

  it("returns null when the entry is older than the TTL", async () => {
    const cache = await loadCache();
    const url = "/api/v1/entries";
    await cache.put(url, { entries: [] }, 200);

    const stale = await cache.get(url, -1);
    expect(stale).toBeNull();

    const fresh = await cache.get(url);
    expect(fresh).not.toBeNull();
  });

  it("treats absolute URLs and relative URLs as the same key", async () => {
    const cache = await loadCache();
    await cache.put("https://tada.living/api/v1/entries", { x: 1 }, 200);

    const hit = await cache.get("/api/v1/entries");
    expect(hit?.body).toEqual({ x: 1 });
  });
});

describe("invalidatePrefix", () => {
  it("drops cached entries whose path matches a mutated resource", async () => {
    const cache = await loadCache();
    await cache.put("/api/v1/entries", [{ id: "a" }], 200);
    await cache.put("/api/v1/entries?limit=20", [{ id: "a" }], 200);
    await cache.put("/api/v1/entries/abc", { id: "abc" }, 200);
    await cache.put("/api/v1/rhythms", [{ id: "r" }], 200);

    await cache.invalidatePrefix("/api/v1/entries");

    expect(await cache.get("/api/v1/entries")).toBeNull();
    expect(await cache.get("/api/v1/entries?limit=20")).toBeNull();
    expect(await cache.get("/api/v1/entries/abc")).toBeNull();
    // Unrelated collection survives.
    expect(await cache.get("/api/v1/rhythms")).not.toBeNull();
  });

  it("busts the collection cache when a child item is mutated", async () => {
    const cache = await loadCache();
    await cache.put("/api/v1/entries", [{ id: "a" }], 200);
    await cache.put("/api/v1/entries/abc", { id: "abc" }, 200);

    // Mutating a single entry should also drop the list cache.
    await cache.invalidatePrefix("/api/v1/entries/abc");

    expect(await cache.get("/api/v1/entries/abc")).toBeNull();
    expect(await cache.get("/api/v1/entries")).toBeNull();
  });

  it("is a no-op for empty prefixes", async () => {
    const cache = await loadCache();
    await cache.put("/api/v1/entries", [], 200);
    await cache.invalidatePrefix("");
    expect(await cache.get("/api/v1/entries")).not.toBeNull();
  });
});

describe("clear", () => {
  it("removes every cached entry", async () => {
    const cache = await loadCache();
    await cache.put("/api/v1/entries", [], 200);
    await cache.put("/api/v1/rhythms", [], 200);

    await cache.clear();

    expect(await cache.get("/api/v1/entries")).toBeNull();
    expect(await cache.get("/api/v1/rhythms")).toBeNull();
  });
});
