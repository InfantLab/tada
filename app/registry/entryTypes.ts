/**
 * Entry Type Registry
 *
 * Central registry for all entry type modules. Entry types register
 * themselves here and consumers look them up by type string.
 *
 * @module registry/entryTypes
 */

import type { EntryTypeDefinition } from "~/types/entryType";

const registry = new Map<string, EntryTypeDefinition>();

/**
 * Register an entry type definition.
 * Throws if a type with the same key is already registered.
 */
export function registerEntryType(definition: EntryTypeDefinition): void {
  if (registry.has(definition.type)) {
    console.warn(
      `[registry] Entry type "${definition.type}" is already registered, overwriting.`,
    );
  }
  registry.set(definition.type, definition);
}

/**
 * Get the full registry Map (read-only usage).
 */
export function getRegisteredTypes(): Map<string, EntryTypeDefinition> {
  return registry;
}

/**
 * Get a specific entry type definition by type string.
 */
export function getEntryTypeDefinition(
  type: string,
): EntryTypeDefinition | undefined {
  return registry.get(type);
}

/**
 * Get all registered type strings.
 */
export function getRegisteredTypeNames(): string[] {
  return Array.from(registry.keys());
}

/**
 * Check if a type is registered.
 */
export function isRegisteredType(type: string): boolean {
  return registry.has(type);
}

/**
 * Get entry types that have quick-add config, sorted by order.
 */
export function getQuickAddTypes(): EntryTypeDefinition[] {
  return Array.from(registry.values())
    .filter((def) => def.quickAdd)
    .sort((a, b) => (a.quickAdd!.order ?? 0) - (b.quickAdd!.order ?? 0));
}
