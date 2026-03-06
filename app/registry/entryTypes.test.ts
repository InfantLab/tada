/**
 * Tests for Entry Type Registry
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  registerEntryType,
  getRegisteredTypes,
  getEntryTypeDefinition,
  getRegisteredTypeNames,
  isRegisteredType,
  getQuickAddTypes,
} from "./entryTypes";
import type { EntryTypeDefinition } from "~/types/entryType";

// Helper to create a minimal valid definition
function makeDef(overrides: Partial<EntryTypeDefinition> = {}): EntryTypeDefinition {
  return {
    type: "test",
    label: "Test",
    emoji: "🧪",
    description: "A test type",
    inputComponent: "TestInput",
    ...overrides,
  };
}

// The registry is module-level state, so we need to be aware of accumulated registrations.
// We use unique type names per test to avoid interference.

describe("entryTypes registry", () => {
  it("should register and retrieve an entry type", () => {
    const def = makeDef({ type: "reg-test-1" });
    registerEntryType(def);
    expect(getEntryTypeDefinition("reg-test-1")).toEqual(def);
  });

  it("should report registered types", () => {
    registerEntryType(makeDef({ type: "reg-test-2" }));
    expect(isRegisteredType("reg-test-2")).toBe(true);
    expect(isRegisteredType("nonexistent-type")).toBe(false);
  });

  it("should return undefined for unknown types", () => {
    expect(getEntryTypeDefinition("does-not-exist")).toBeUndefined();
  });

  it("should list all registered type names", () => {
    registerEntryType(makeDef({ type: "reg-test-3a" }));
    registerEntryType(makeDef({ type: "reg-test-3b" }));
    const names = getRegisteredTypeNames();
    expect(names).toContain("reg-test-3a");
    expect(names).toContain("reg-test-3b");
  });

  it("should overwrite on duplicate registration with warning", () => {
    registerEntryType(makeDef({ type: "reg-test-4", label: "First" }));
    registerEntryType(makeDef({ type: "reg-test-4", label: "Second" }));
    expect(getEntryTypeDefinition("reg-test-4")?.label).toBe("Second");
  });

  it("should return quick-add types sorted by order", () => {
    registerEntryType(
      makeDef({
        type: "reg-test-5a",
        quickAdd: { icon: "a", color: "bg-red-500", order: 2 },
      }),
    );
    registerEntryType(
      makeDef({
        type: "reg-test-5b",
        quickAdd: { icon: "b", color: "bg-blue-500", order: 1 },
      }),
    );
    const quickAdds = getQuickAddTypes();
    const testItems = quickAdds.filter((d) =>
      d.type.startsWith("reg-test-5"),
    );
    expect(testItems[0]?.type).toBe("reg-test-5b"); // order 1
    expect(testItems[1]?.type).toBe("reg-test-5a"); // order 2
  });

  it("should expose the registry Map", () => {
    registerEntryType(makeDef({ type: "reg-test-6" }));
    const map = getRegisteredTypes();
    expect(map).toBeInstanceOf(Map);
    expect(map.has("reg-test-6")).toBe(true);
  });
});
