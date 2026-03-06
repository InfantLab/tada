/**
 * Tests for Importer Registry
 */

import { describe, it, expect } from "vitest";
import {
  registerImporter,
  getRegisteredImporters,
  getImporter,
  getImportersForFileType,
} from "./importers";
import type { DataImporter } from "~/types/importer";

function makeImporter(overrides: Partial<DataImporter> = {}): DataImporter {
  return {
    id: "test-importer",
    name: "Test Importer",
    description: "A test importer",
    fileTypes: [".csv"],
    icon: "📥",
    parse: async () => [],
    ...overrides,
  };
}

describe("importers registry", () => {
  it("should register and retrieve an importer", () => {
    const imp = makeImporter({ id: "imp-test-1" });
    registerImporter(imp);
    expect(getImporter("imp-test-1")).toEqual(imp);
  });

  it("should return undefined for unknown importer", () => {
    expect(getImporter("nonexistent-importer")).toBeUndefined();
  });

  it("should find importers by file type", () => {
    registerImporter(makeImporter({ id: "imp-test-2", fileTypes: [".json", ".jsonl"] }));
    const matches = getImportersForFileType(".json");
    expect(matches.some((m) => m.id === "imp-test-2")).toBe(true);
  });

  it("should be case-insensitive for file type matching", () => {
    registerImporter(makeImporter({ id: "imp-test-3", fileTypes: [".CSV"] }));
    const matches = getImportersForFileType(".csv");
    expect(matches.some((m) => m.id === "imp-test-3")).toBe(true);
  });

  it("should expose the registry Map", () => {
    registerImporter(makeImporter({ id: "imp-test-4" }));
    const map = getRegisteredImporters();
    expect(map).toBeInstanceOf(Map);
    expect(map.has("imp-test-4")).toBe(true);
  });
});
