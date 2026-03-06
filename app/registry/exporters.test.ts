/**
 * Tests for Exporter Registry
 */

import { describe, it, expect } from "vitest";
import {
  registerExporter,
  getRegisteredExporters,
  getExporter,
  getExporterList,
} from "./exporters";
import type { DataExporter } from "~/types/exporter";

function makeExporter(overrides: Partial<DataExporter> = {}): DataExporter {
  return {
    id: "test-exporter",
    name: "Test Exporter",
    description: "A test exporter",
    fileExtension: ".json",
    mimeType: "application/json",
    icon: "📤",
    export: async () => new Blob([]),
    ...overrides,
  };
}

describe("exporters registry", () => {
  it("should register and retrieve an exporter", () => {
    const exp = makeExporter({ id: "exp-test-1" });
    registerExporter(exp);
    expect(getExporter("exp-test-1")).toEqual(exp);
  });

  it("should return undefined for unknown exporter", () => {
    expect(getExporter("nonexistent-exporter")).toBeUndefined();
  });

  it("should overwrite on duplicate registration", () => {
    registerExporter(makeExporter({ id: "exp-test-2", name: "First" }));
    registerExporter(makeExporter({ id: "exp-test-2", name: "Second" }));
    expect(getExporter("exp-test-2")?.name).toBe("Second");
  });

  it("should list all exporters", () => {
    registerExporter(makeExporter({ id: "exp-test-3a" }));
    registerExporter(makeExporter({ id: "exp-test-3b" }));
    const list = getExporterList();
    expect(list.some((e) => e.id === "exp-test-3a")).toBe(true);
    expect(list.some((e) => e.id === "exp-test-3b")).toBe(true);
  });

  it("should expose the registry Map", () => {
    registerExporter(makeExporter({ id: "exp-test-4" }));
    const map = getRegisteredExporters();
    expect(map).toBeInstanceOf(Map);
    expect(map.has("exp-test-4")).toBe(true);
  });
});
