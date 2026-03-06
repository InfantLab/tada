/**
 * Importer Registry
 *
 * Central registry for data import modules.
 *
 * @module registry/importers
 */

import type { DataImporter } from "~/types/importer";

const registry = new Map<string, DataImporter>();

/**
 * Register a data importer.
 */
export function registerImporter(importer: DataImporter): void {
  if (registry.has(importer.id)) {
    console.warn(
      `[registry] Importer "${importer.id}" is already registered, overwriting.`,
    );
  }
  registry.set(importer.id, importer);
}

/**
 * Get all registered importers.
 */
export function getRegisteredImporters(): Map<string, DataImporter> {
  return registry;
}

/**
 * Get a specific importer by ID.
 */
export function getImporter(id: string): DataImporter | undefined {
  return registry.get(id);
}

/**
 * Find importers that support a given file extension.
 */
export function getImportersForFileType(extension: string): DataImporter[] {
  const ext = extension.toLowerCase();
  return Array.from(registry.values()).filter((imp) =>
    imp.fileTypes.some((ft) => ft.toLowerCase() === ext),
  );
}
