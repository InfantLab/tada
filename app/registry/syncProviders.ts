/**
 * Sync Provider Registry
 *
 * Central registry for sync provider modules.
 *
 * @module registry/syncProviders
 */

import type { SyncProvider } from "~/types/syncProvider";

const registry = new Map<string, SyncProvider>();

/**
 * Register a sync provider.
 */
export function registerSyncProvider(provider: SyncProvider): void {
  if (registry.has(provider.id)) {
    console.warn(
      `[registry] Sync provider "${provider.id}" is already registered, overwriting.`,
    );
  }
  registry.set(provider.id, provider);
}

/**
 * Get all registered sync providers.
 */
export function getRegisteredSyncProviders(): Map<string, SyncProvider> {
  return registry;
}

/**
 * Get a specific sync provider by ID.
 */
export function getSyncProvider(id: string): SyncProvider | undefined {
  return registry.get(id);
}

/**
 * Get all sync providers as a sorted array.
 */
export function getSyncProviderList(): SyncProvider[] {
  return Array.from(registry.values());
}
