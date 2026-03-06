/**
 * Tests for EntryTypeSchema validation with shared registered types.
 * Phase 6, task 6.4.
 */

import { describe, it, expect } from "vitest";
import { REGISTERED_ENTRY_TYPES, isKnownEntryType } from "./registeredTypes";
import { EntryTypeSchema } from "~/utils/entrySchemas";

describe("registeredTypes", () => {
  it("should include all core types", () => {
    expect(REGISTERED_ENTRY_TYPES).toContain("timed");
    expect(REGISTERED_ENTRY_TYPES).toContain("tally");
    expect(REGISTERED_ENTRY_TYPES).toContain("moment");
    expect(REGISTERED_ENTRY_TYPES).toContain("tada");
  });

  it("should include exercise type", () => {
    expect(REGISTERED_ENTRY_TYPES).toContain("exercise");
  });

  it("should correctly identify known types", () => {
    for (const type of REGISTERED_ENTRY_TYPES) {
      expect(isKnownEntryType(type)).toBe(true);
    }
  });

  it("should reject unknown types", () => {
    expect(isKnownEntryType("bogus")).toBe(false);
    expect(isKnownEntryType("")).toBe(false);
    expect(isKnownEntryType("TIMED")).toBe(false); // case-sensitive
  });
});

describe("EntryTypeSchema", () => {
  it("should accept all registered types", () => {
    for (const type of REGISTERED_ENTRY_TYPES) {
      const result = EntryTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it("should reject unknown types", () => {
    const result = EntryTypeSchema.safeParse("unknown-type");
    expect(result.success).toBe(false);
  });
});
