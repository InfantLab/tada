/**
 * Moment Entry Type Module
 *
 * Captures dreams, magic moments, gratitude, and journal entries.
 * Supports voice input with LLM-powered ta-da extraction.
 *
 * @module modules/entry-types/moment
 */

import { registerEntryType } from "~/registry/entryTypes";
import type { EntryTypeDefinition } from "~/types/entryType";

export const momentDefinition: EntryTypeDefinition = {
  type: "moment",
  label: "Moments",
  emoji: "✨",
  description: "Dreams, magic & reflections",

  inputComponent: "MomentInput",

  quickAdd: {
    icon: "sparkles",
    color: "bg-purple-500",
    order: 4,
  },

  navigation: {
    href: "/moments",
    icon: "sparkles",
    order: 4,
  },
};

// Self-register when imported
registerEntryType(momentDefinition);
