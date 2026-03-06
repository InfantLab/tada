/**
 * Registered Entry Types — Shared between client and server
 *
 * This is the canonical list of valid entry type strings.
 * When adding a new entry type module, add its type string here.
 *
 * The client-side registry provides full EntryTypeDefinition objects
 * with component references. This file provides just the type strings
 * for server-side validation where components aren't available.
 *
 * @module shared/registeredTypes
 */

/**
 * All known entry type strings.
 * Add new types here when creating a new entry type module.
 */
export const REGISTERED_ENTRY_TYPES = [
  "timed",
  "tally",
  "moment",
  "tada",
  "exercise",
] as const;

export type RegisteredEntryType = (typeof REGISTERED_ENTRY_TYPES)[number];

/**
 * Check if a string is a known entry type.
 */
export function isKnownEntryType(type: string): type is RegisteredEntryType {
  return (REGISTERED_ENTRY_TYPES as readonly string[]).includes(type);
}
