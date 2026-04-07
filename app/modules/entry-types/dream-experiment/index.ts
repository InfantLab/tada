/**
 * Dream Experiment Entry Type Module (013-ourmoji-module)
 *
 * Receiver-side morning flow: dream capture, guess, reveal.
 * Self-registers with the entry type registry on import.
 */

import { registerEntryType } from "~/registry/entryTypes";
import type { EntryTypeDefinition } from "~/types/entryType";

export const dreamExperimentDefinition: EntryTypeDefinition = {
  type: "dream-experiment",
  label: "Dream Experiment",
  emoji: "💭",
  description: "Morning dream capture + guess + reveal",

  inputComponent: "DreamExperimentFlow",
};

registerEntryType(dreamExperimentDefinition);
