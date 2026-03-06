/**
 * Entry Type Definition Interface
 *
 * Each entry type module exports an EntryTypeDefinition that describes
 * the type's metadata, components, and behavior.
 *
 * @module types/entryType
 */

import type { ZodSchema } from "zod";

export interface EntryTypeQuickAdd {
  icon: string;
  color: string; // Tailwind class, e.g. "bg-amber-500"
  order: number; // Menu position
}

export interface EntryTypeNavigation {
  href: string;
  icon: string; // Heroicons class
  order: number;
}

export interface EntryTypeDefinition {
  type: string; // e.g., "timed", "tada", "exercise"
  label: string; // Human-readable name
  emoji: string; // Default emoji for display
  description: string; // Short description for settings/menus

  // Data validation
  dataSchema?: ZodSchema; // Validates the `data` JSON field
  requiresDuration?: boolean; // Must have durationSeconds > 0
  requiresCount?: boolean; // Must have count > 0

  // Component references (resolved by Nuxt auto-imports)
  inputComponent: string; // Component name for entry creation form
  timelineComponent?: string; // Optional: custom timeline card
  detailComponent?: string; // Optional: custom entry detail view

  // Quick add menu entry (optional)
  quickAdd?: EntryTypeQuickAdd;

  // Navigation entry (optional)
  navigation?: EntryTypeNavigation;
}
