/**
 * Wheel of the Year — static calendar of named days.
 *
 * Phase 2 includes a representative seed dataset (the 8 traditional sabbats
 * + a handful of cultural anchor days). The full ~65-day list referenced in
 * TED-SPEC §1 will be expanded in a polish pass; downstream code only relies
 * on the lookup helpers below, so additions are non-breaking.
 *
 * Moveable feasts (lunar-dependent) are NOT yet modelled — they require
 * annual recalculation and live in a separate `moveableFeasts.ts` (TBD).
 */

export type WheelCategory =
  | "sabbat"
  | "solar"
  | "cultural"
  | "scientific"
  | "personal";

export interface WheelOfYearEntry {
  /** MM-DD (annual recurrence). */
  monthDay: string;
  name: string;
  category: WheelCategory;
  /** Optional one-line note for the daily reflection. */
  note?: string;
}

export const WHEEL_OF_YEAR: readonly WheelOfYearEntry[] = [
  // Wheel of the Year — fixed-date sabbats / cross-quarter approximations
  { monthDay: "02-01", name: "Imbolc",            category: "sabbat", note: "first stirrings of spring" },
  { monthDay: "03-20", name: "Spring Equinox",    category: "solar",  note: "balance of light" },
  { monthDay: "05-01", name: "Beltane",           category: "sabbat", note: "fire and fertility" },
  { monthDay: "06-21", name: "Summer Solstice",   category: "solar",  note: "longest day" },
  { monthDay: "08-01", name: "Lammas",            category: "sabbat", note: "first harvest" },
  { monthDay: "09-22", name: "Autumn Equinox",    category: "solar",  note: "balance returns" },
  { monthDay: "10-31", name: "Samhain",           category: "sabbat", note: "thinning of the veil" },
  { monthDay: "12-21", name: "Winter Solstice",   category: "solar",  note: "longest night" },

  // Cultural / scientific anchors
  { monthDay: "04-12", name: "Yuri's Night",      category: "scientific", note: "first human in space (1961)" },
  { monthDay: "04-22", name: "Earth Day",         category: "cultural" },
  { monthDay: "07-20", name: "Moon Landing Day",  category: "scientific", note: "Apollo 11, 1969" },
  { monthDay: "11-01", name: "Day of the Dead",   category: "cultural" },
];

/** Returns all wheel entries for a given ISO date (YYYY-MM-DD). */
export function getWheelEntriesForDate(
  isoDate: string,
): WheelOfYearEntry[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return [];
  const monthDay = isoDate.slice(5);
  return WHEEL_OF_YEAR.filter((e) => e.monthDay === monthDay);
}

/** Returns the primary wheel name for a date, or null. */
export function getPrimaryWheelName(isoDate: string): string | null {
  return getWheelEntriesForDate(isoDate)[0]?.name ?? null;
}

/** Returns the primary wheel category for a date, or null. */
export function getPrimaryWheelCategory(
  isoDate: string,
): WheelCategory | null {
  return getWheelEntriesForDate(isoDate)[0]?.category ?? null;
}
