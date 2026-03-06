/**
 * Module Manifest Shape Tests
 *
 * Validates that each entry type module exports a correct EntryTypeDefinition.
 * Phase 6, task 6.9.
 */

import { describe, it, expect } from "vitest";
import { tadaDefinition } from "./tada";
import { timedDefinition } from "./timed";
import { tallyDefinition } from "./tally";
import { momentDefinition } from "./moment";
import { exerciseDefinition } from "./exercise";
import type { EntryTypeDefinition } from "~/types/entryType";

const modules: Array<{ name: string; def: EntryTypeDefinition }> = [
  { name: "tada", def: tadaDefinition },
  { name: "timed", def: timedDefinition },
  { name: "tally", def: tallyDefinition },
  { name: "moment", def: momentDefinition },
  { name: "exercise", def: exerciseDefinition },
];

describe("module manifest shapes", () => {
  for (const { name, def } of modules) {
    describe(name, () => {
      it("should have required string fields", () => {
        expect(def.type).toBe(name);
        expect(typeof def.label).toBe("string");
        expect(def.label.length).toBeGreaterThan(0);
        expect(typeof def.emoji).toBe("string");
        expect(def.emoji.length).toBeGreaterThan(0);
        expect(typeof def.description).toBe("string");
        expect(def.description.length).toBeGreaterThan(0);
      });

      it("should have an inputComponent", () => {
        expect(typeof def.inputComponent).toBe("string");
        expect(def.inputComponent.length).toBeGreaterThan(0);
      });

      it("should have valid quickAdd if defined", () => {
        if (def.quickAdd) {
          expect(typeof def.quickAdd.icon).toBe("string");
          expect(typeof def.quickAdd.color).toBe("string");
          expect(typeof def.quickAdd.order).toBe("number");
        }
      });

      it("should have valid navigation if defined", () => {
        if (def.navigation) {
          expect(typeof def.navigation.href).toBe("string");
          expect(def.navigation.href.startsWith("/")).toBe(true);
          expect(typeof def.navigation.icon).toBe("string");
          expect(typeof def.navigation.order).toBe("number");
        }
      });
    });
  }
});
