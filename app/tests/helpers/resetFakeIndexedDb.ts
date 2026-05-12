/**
 * Reset fake-indexeddb between tests so each test gets a clean DB.
 *
 * `fake-indexeddb/auto` installs a single IDBFactory on the global. Tests
 * that exercise `apiCache.ts` cache the open `IDBDatabase` in a module-level
 * promise, so resetting the factory alone won't drop the connection — we
 * also force the cache module to be re-imported via `vi.resetModules()`.
 */

export function resetFakeIndexedDb(): void {
  // fake-indexeddb exposes a `resetDebug` helper on the factory in some
  // versions; in current builds, the simplest reliable reset is to install
  // a fresh factory.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FDBFactory = require("fake-indexeddb/lib/FDBFactory").default;
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new FDBFactory();
}
