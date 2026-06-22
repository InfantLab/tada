/**
 * IndexedDB-backed queue for entry-creation POSTs that fail due to a
 * genuine network error (airplane mode, no signal) rather than a
 * validation error. Scoped narrowly to `POST /api/entries` — see
 * docs/plans (offline Tier 2 scope decision): editing/deleting offline
 * is not queued, only creation.
 *
 * Mirrors apiCache.ts's style: every method swallows IndexedDB errors,
 * because a failure here must never break the write path further than
 * it's already broken (offline).
 */

const DB_NAME = "tada-api-cache";
const DB_VERSION = 2;
const STORE = "pendingWrites";

export type QueuedWrite = {
  id: string;
  url: string;
  method: string;
  body: unknown;
  createdAt: number;
  sequence: number;
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
      // Shared DB with apiCache.ts — both modules must agree on a single
      // version and create both stores, since whichever module opens the
      // DB first runs the upgrade for both.
      if (!db.objectStoreNames.contains("responses")) {
        db.createObjectStore("responses", { keyPath: "url" });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
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

function generateId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Date.now() alone can collide for writes enqueued in the same millisecond
// (e.g. a batch of tadas); this counter breaks ties so listPending() stays
// strictly FIFO regardless of clock resolution.
let sequenceCounter = 0;

export async function enqueue(
  write: Omit<QueuedWrite, "id" | "createdAt" | "sequence">,
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const entry: QueuedWrite = {
      id: generateId(),
      createdAt: Date.now(),
      sequence: sequenceCounter++,
      ...write,
    };
    await reqToPromise(
      db.transaction(STORE, "readwrite").objectStore(STORE).put(entry),
    );
  } catch {
    // Swallow — losing the queue entry is bad, but throwing here would
    // mask the original OfflineWriteError with an IndexedDB error.
  }
}

export async function listPending(): Promise<QueuedWrite[]> {
  const db = await openDb();
  if (!db) return [];
  try {
    const result = await reqToPromise(
      db.transaction(STORE, "readonly").objectStore(STORE).getAll(),
    );
    // getAll() orders by the keyPath (a random id), not insertion order —
    // sort by createdAt (then sequence, to break same-millisecond ties) so
    // flush replay preserves FIFO order.
    return ((result as QueuedWrite[] | null) ?? []).sort(
      (a, b) => a.createdAt - b.createdAt || a.sequence - b.sequence,
    );
  } catch {
    return [];
  }
}

export async function remove(id: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    await reqToPromise(
      db.transaction(STORE, "readwrite").objectStore(STORE).delete(id),
    );
  } catch {
    // Swallow.
  }
}
