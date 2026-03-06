/**
 * Tally Entry Type Module
 *
 * Tracks counted activities: reps, sets, habits, or any numeric count.
 * Supports voice input for batch tally entry.
 *
 * @module modules/entry-types/tally
 */

import { registerEntryType } from "~/registry/entryTypes";
import type { EntryTypeDefinition } from "~/types/entryType";

export const tallyDefinition: EntryTypeDefinition = {
  type: "tally",
  label: "Tally",
  emoji: "🔢",
  description: "Track reps, counts & quick activities",

  requiresCount: true,

  inputComponent: "TallyInput",

  quickAdd: {
    icon: "hashtag",
    color: "bg-amber-500",
    order: 3,
  },

  navigation: {
    href: "/tally",
    icon: "hashtag",
    order: 3,
  },
};

// Self-register when imported
registerEntryType(tallyDefinition);
