/**
 * Ta-Da Entry Type Module
 *
 * Celebrates accomplishments with positive reinforcement.
 * Supports voice input, multi-tada batch creation, and celebration animations.
 *
 * @module modules/entry-types/tada
 */

import { registerEntryType } from "~/registry/entryTypes";
import type { EntryTypeDefinition } from "~/types/entryType";

export const tadaDefinition: EntryTypeDefinition = {
  type: "tada",
  label: "Ta-Da!",
  emoji: "⚡",
  description: "Celebrate accomplishments & wins",

  inputComponent: "TadaInput",

  quickAdd: {
    icon: "bolt",
    color: "bg-amber-500",
    order: 1,
  },

  navigation: {
    href: "/tada",
    icon: "bolt",
    order: 1,
  },
};

// Self-register when imported
registerEntryType(tadaDefinition);
