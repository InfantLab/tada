/**
 * Exercise Entry Type Module
 *
 * Tracks physical activities with type, duration, and intensity.
 * Created as Phase 5 validation: proving a new entry type can be
 * added with minimal core changes (only registeredTypes.ts).
 */

import type { EntryTypeDefinition } from "~/types/entryType";
import { registerEntryType } from "~/registry/entryTypes";

export const exerciseDefinition: EntryTypeDefinition = {
  type: "exercise",
  label: "Exercise",
  emoji: "💪",
  description: "Track workouts, runs, and physical activities",
  requiresDuration: true,

  inputComponent: "ExerciseInput",

  quickAdd: {
    icon: "fire",
    color: "bg-red-500",
    order: 5,
  },

  navigation: {
    href: "/create/exercise",
    icon: "fire",
    order: 5,
  },
};

registerEntryType(exerciseDefinition);
