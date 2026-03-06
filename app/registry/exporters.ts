/**
 * Exporter Registry
 *
 * Central registry for data export modules.
 *
 * @module registry/exporters
 */

import type { DataExporter } from "~/types/exporter";

const registry = new Map<string, DataExporter>();

/**
 * Register a data exporter.
 */
export function registerExporter(exporter: DataExporter): void {
  if (registry.has(exporter.id)) {
    console.warn(
      `[registry] Exporter "${exporter.id}" is already registered, overwriting.`,
    );
  }
  registry.set(exporter.id, exporter);
}

/**
 * Get all registered exporters.
 */
export function getRegisteredExporters(): Map<string, DataExporter> {
  return registry;
}

/**
 * Get a specific exporter by ID.
 */
export function getExporter(id: string): DataExporter | undefined {
  return registry.get(id);
}

/**
 * Get all exporters as a sorted array.
 */
export function getExporterList(): DataExporter[] {
  return Array.from(registry.values());
}
