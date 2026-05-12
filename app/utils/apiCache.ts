/**
 * IndexedDB-backed read-cache for /api/* GETs.
 *
 * Phase 2.5 of v0.7.0 (option A offline). The api-client plugin writes every
 * successful GET response to this cache and reads from it on network failure
 * so users can browse entries / timeline / rhythms in airplane mode after a
 * first online load.
 *
 * Mutations DO NOT touch this cache; they call `invalidatePrefix()` to drop
 * stale reads. Write-queueing (option B) is out of scope for v0.7.0.
 *
 * Failure mode: every method swallows IndexedDB errors and returns the safe
 * fallback (null on miss, false on put failure). Cache failures must never
 * break a UI flow; the worst outcome is a network-only experience.
 *
 * See docs/plans/native-android.md §2.5 and the memory entry
 * `project_v070_offline_android.md`.
 */

const DB_NAME = "tada-api-cache";
const DB_VERSION = 1;
const STORE = "responses";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CacheEntry = {
  url: string;
  body: unknown;
  status: number;
  fetchedAt: number;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T | null> {
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export function stripOrigin(url: string): string {
  if (url.startsWith("/")) return url;
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export function isCacheable(url: string, method: string): boolean {
  if (method.toUpperCase() !== "GET") return false;
  const path = stripOrigin(url).split("?")[0] ?? "";
  if (!path.startsWith("/api/")) return false;
  if (path.startsWith("/api/auth/")) return false;
  if (path === "/api/v1/health" || path === "/api/health") return false;
  if (path === "/api/openapi.json") return false;
  if (path.startsWith("/api/push/")) return false;
  return true;
}

export async function get(
  url: string,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<CacheEntry | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const key = stripOrigin(url);
    const entry = await reqToPromise(
      db.transaction(STORE, "readonly").objectStore(STORE).get(key),
    );
    if (!entry) return null;
    const e = entry as CacheEntry;
    if (Date.now() - e.fetchedAt > ttlMs) return null;
    return e;
  } catch {
    return null;
  }
}

export async function put(
  url: string,
  body: unknown,
  status: number,
): Promise<boolean> {
  if (status < 200 || status >= 300) return false;
  const db = await openDb();
  if (!db) return false;
  try {
    const key = stripOrigin(url);
    const entry: CacheEntry = { url: key, body, status, fetchedAt: Date.now() };
    await reqToPromise(
      db.transaction(STORE, "readwrite").objectStore(STORE).put(entry),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Drop every cached entry whose key matches `prefix`. Called after a
 * successful mutation so the next read goes back to the network. Compares by
 * URL path (ignoring query) — a mutation on `/api/v1/entries` busts
 * `/api/v1/entries?limit=20` too.
 */
export async function invalidatePrefix(prefix: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const normalised = stripOrigin(prefix).split("?")[0] ?? "";
  if (!normalised) return;
  try {
    await new Promise<void>((resolve) => {
      const tr = db.transaction(STORE, "readwrite");
      const store = tr.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const key = String(cursor.value.url);
        const path = key.split("?")[0] ?? key;
        if (
          path === normalised ||
          path.startsWith(normalised + "/") ||
          // Bust collection reads when an item under it changes — a PUT to
          // `/api/v1/entries/abc` should also drop cached `/api/v1/entries`.
          normalised.startsWith(path + "/")
        ) {
          cursor.delete();
        }
        cursor.continue();
      };
      tr.oncomplete = () => resolve();
      tr.onerror = () => resolve();
      tr.onabort = () => resolve();
    });
  } catch {
    // Swallow.
  }
}

export async function clear(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    await reqToPromise(
      db.transaction(STORE, "readwrite").objectStore(STORE).clear(),
    );
  } catch {
    // Swallow.
  }
}

export function _resetForTests(): void {
  dbPromise = null;
}
