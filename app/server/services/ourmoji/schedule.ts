/**
 * Schedule helpers for the Ourmoji nightly assignment sweep.
 *
 * Per Decision 8 (research.md): the nightly anchor is 21:00 in the
 * earliest participant timezone. We compute that anchor as a UTC
 * Date so the scheduler can compare it cheaply against `now`.
 */

import { NIGHTLY_ASSIGNMENT_HOUR_LOCAL } from "~/utils/ourmoji/constants";
import type { OurmojiExperimentRun } from "~/server/db/schema";

/**
 * Compute the UTC instant of the next 21:00 anchor for a run, given
 * "now". If today's anchor in the earliest tz has not yet passed,
 * return today's anchor; otherwise return tomorrow's.
 *
 * Falls back to UTC if the timezone string is invalid.
 */
export function computeNextAnchorUtc(
  run: Pick<OurmojiExperimentRun, "earliestParticipantTimezone">,
  now: Date = new Date(),
): Date {
  const tz = run.earliestParticipantTimezone || "UTC";

  // Compute today's local Y/M/D in the run's timezone.
  const localParts = getLocalYMD(now, tz);
  const todaysAnchorUtc = localYmdHmToUtc(
    localParts.year,
    localParts.month,
    localParts.day,
    NIGHTLY_ASSIGNMENT_HOUR_LOCAL,
    0,
    tz,
  );

  if (todaysAnchorUtc.getTime() > now.getTime()) {
    return todaysAnchorUtc;
  }

  // Otherwise tomorrow.
  const tomorrowLocal = addDaysLocal(localParts, 1);
  return localYmdHmToUtc(
    tomorrowLocal.year,
    tomorrowLocal.month,
    tomorrowLocal.day,
    NIGHTLY_ASSIGNMENT_HOUR_LOCAL,
    0,
    tz,
  );
}

/**
 * Returns the YYYY-MM-DD "night date" identifier for a given anchor
 * instant — this is the *local* calendar date in the run's tz at the
 * moment of the 21:00 anchor.
 */
export function nightDateForAnchor(
  anchorUtc: Date,
  timezone: string,
): string {
  const { year, month, day } = getLocalYMD(anchorUtc, timezone);
  return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Compute night index = (nightDate - startDate) in whole days.
 * Used as a deterministic seed component.
 */
export function nightIndexForRun(
  startDate: string,
  nightDate: string,
): number {
  const start = Date.UTC(
    Number(startDate.slice(0, 4)),
    Number(startDate.slice(5, 7)) - 1,
    Number(startDate.slice(8, 10)),
  );
  const night = Date.UTC(
    Number(nightDate.slice(0, 4)),
    Number(nightDate.slice(5, 7)) - 1,
    Number(nightDate.slice(8, 10)),
  );
  return Math.round((night - start) / (24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------
// Timezone-safe primitives — implemented with Intl, no extra deps.
// ---------------------------------------------------------------------------

interface LocalYMD {
  year: number;
  month: number; // 1..12
  day: number;
}

function getLocalYMD(d: Date, tz: string): LocalYMD {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const day = Number(parts.find((p) => p.type === "day")!.value);
  return { year, month, day };
}

/**
 * Convert a local Y/M/D h/m in `tz` to a UTC Date.
 *
 * Algorithm: pick a UTC guess equal to the same wall-clock components,
 * then look at how that guess renders in `tz` and adjust by the offset.
 */
function localYmdHmToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string,
): Date {
  // First guess: treat the local components as if they were UTC.
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  // What does that instant look like in tz?
  const localOfGuess = getLocalParts(guess, tz);
  // Difference between desired local time and what the guess produced.
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  const actual = Date.UTC(
    localOfGuess.year,
    localOfGuess.month - 1,
    localOfGuess.day,
    localOfGuess.hour,
    localOfGuess.minute,
  );
  return new Date(guess.getTime() + (desired - actual));
}

interface LocalParts extends LocalYMD {
  hour: number;
  minute: number;
}

function getLocalParts(d: Date, tz: string): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24, // Intl may emit "24" at midnight in some locales
    minute: get("minute"),
  };
}

function addDaysLocal(d: LocalYMD, days: number): LocalYMD {
  const utc = new Date(Date.UTC(d.year, d.month - 1, d.day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const pad4 = (n: number) => String(n).padStart(4, "0");
