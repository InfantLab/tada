/**
 * Timed Entry Type Module
 *
 * Timer-based activities: meditation, practice, focus sessions.
 * Supports fixed/unlimited modes, interval bells, warm-up,
 * session recovery, voice reflection, and post-session capture.
 *
 * @module modules/entry-types/timed
 */

import { registerEntryType } from "~/registry/entryTypes";
import type { EntryTypeDefinition } from "~/types/entryType";

export const timedDefinition: EntryTypeDefinition = {
  type: "timed",
  label: "Sessions",
  emoji: "⏱️",
  description: "Timer for meditation, practice & focus",

  requiresDuration: true,

  inputComponent: "TimedInput",

  quickAdd: {
    icon: "clock",
    color: "bg-emerald-500",
    order: 2,
  },

  navigation: {
    href: "/sessions",
    icon: "clock",
    order: 2,
  },
};

// Self-register when imported
registerEntryType(timedDefinition);
