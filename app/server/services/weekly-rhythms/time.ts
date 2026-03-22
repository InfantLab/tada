/**
 * Timezone-aware time window helpers for weekly rhythms.
 *
 * All boundaries are computed in the user's local timezone using
 * Intl.DateTimeFormat, then converted to UTC for database queries.
 */

import { createLogger } from "~/server/utils/logger";

const logger = createLogger("service:weekly-rhythms:time");

/** Monday 00:00:00 in the user's local timezone for the week containing `date` */
export function getWeekStartLocal(date: Date, timezone: string): Date {
  // Get the local day-of-week in the user's timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localDateStr = formatter.format(date); // "YYYY-MM-DD"
  const [year, month, day] = localDateStr.split("-").map(Number) as [number, number, number];

  // Create a date for this local day
  const localDate = new Date(year, month - 1, day);
  const dayOfWeek = localDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  localDate.setDate(localDate.getDate() + mondayOffset);

  // Convert local Monday 00:00:00 to UTC
  const mondayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}T00:00:00`;
  return toUtcFromLocal(mondayStr, timezone);
}

/** Sunday 23:59:59.999 in the user's local timezone for the week containing `date` */
export function getWeekEndLocal(date: Date, timezone: string): Date {
  const weekStart = getWeekStartLocal(date, timezone);
  // Add 6 days 23:59:59.999 in local time
  const startLocal = toLocalString(weekStart, timezone);
  const [datePart] = startLocal.split("T");
  const [year, month, day] = datePart!.split("-").map(Number) as [number, number, number];
  const sunday = new Date(year, month - 1, day + 6);
  const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}T23:59:59`;
  return toUtcFromLocal(sundayStr, timezone);
}

/** Get the Monday and Sunday boundaries for celebrations */
export function getWeekBoundaries(
  date: Date,
  timezone: string,
): {
  weekStartDate: string; // YYYY-MM-DD (local Monday)
  weekEndDate: string; // YYYY-MM-DD (local Sunday)
  utcStart: string; // ISO 8601
  utcEnd: string; // ISO 8601
  localStart: string; // ISO 8601 (local)
  localEnd: string; // ISO 8601 (local)
} {
  const utcStart = getWeekStartLocal(date, timezone);
  const utcEnd = getWeekEndLocal(date, timezone);

  const localStartStr = toLocalString(utcStart, timezone);
  const localEndStr = toLocalString(utcEnd, timezone);

  const weekStartDate = localStartStr.split("T")[0]!;
  const weekEndDate = localEndStr.split("T")[0]!;

  return {
    weekStartDate,
    weekEndDate,
    utcStart: utcStart.toISOString(),
    utcEnd: utcEnd.toISOString(),
    localStart: localStartStr,
    localEnd: localEndStr,
  };
}

/** Get the Thursday window for encouragement (Mon 00:00 to Thu at scheduled time) */
export function getThursdayWindow(
  date: Date,
  timezone: string,
  localTime: string = "15:03",
): {
  weekStartDate: string;
  utcStart: string;
  utcEnd: string;
  localStart: string;
  localEnd: string;
} {
  const weekStart = getWeekStartLocal(date, timezone);
  const localStartStr = toLocalString(weekStart, timezone);
  const weekStartDate = localStartStr.split("T")[0]!;

  // Thursday = Monday + 3 days
  const [year, month, day] = weekStartDate.split("-").map(Number) as [number, number, number];
  const thursday = new Date(year, month - 1, day + 3);
  const thursdayStr = `${thursday.getFullYear()}-${String(thursday.getMonth() + 1).padStart(2, "0")}-${String(thursday.getDate()).padStart(2, "0")}T${localTime}:00`;

  const utcEnd = toUtcFromLocal(thursdayStr, timezone);

  return {
    weekStartDate,
    utcStart: weekStart.toISOString(),
    utcEnd: utcEnd.toISOString(),
    localStart: localStartStr,
    localEnd: thursdayStr,
  };
}

/**
 * Compute the next UTC time for a given local HH:MM on a specific day offset
 * from the current week's Monday.
 *
 * @param dayOffset 0=Monday, 3=Thursday, etc.
 * @param localTime "HH:MM" in user's timezone
 */
export function getNextScheduledUtc(
  now: Date,
  timezone: string,
  dayOffset: number,
  localTime: string,
): Date {
  const weekStart = getWeekStartLocal(now, timezone);
  const localStartStr = toLocalString(weekStart, timezone);
  const weekStartDate = localStartStr.split("T")[0]!;

  const [year, month, day] = weekStartDate.split("-").map(Number) as [number, number, number];
  const targetDate = new Date(year, month - 1, day + dayOffset);
  const targetStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}T${localTime}:00`;

  return toUtcFromLocal(targetStr, timezone);
}

/**
 * Compute the next future UTC time for a scheduled event.
 * If this week's time has already passed, returns next week's time.
 */
export function getNextFutureScheduledUtc(
  now: Date,
  timezone: string,
  dayOffset: number,
  localTime: string,
): Date {
  const thisWeek = getNextScheduledUtc(now, timezone, dayOffset, localTime);
  if (thisWeek > now) return thisWeek;
  // This week's time has passed — advance to next week
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return getNextScheduledUtc(nextWeek, timezone, dayOffset, localTime);
}

/** Format a YYYY-MM-DD date string from a local-perspective date */
export function formatLocalDate(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/** Format a human-readable week label like "Mar 16 – 22, 2026" */
export function formatWeekLabel(weekStartDate: string, weekEndDate: string): string {
  const [sy, sm, sd] = weekStartDate.split("-").map(Number) as [number, number, number];
  const [ey, em, ed] = weekEndDate.split("-").map(Number) as [number, number, number];

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  if (sy === ey && sm === em) {
    return `${months[sm - 1]} ${sd} – ${ed}, ${sy}`;
  }
  if (sy === ey) {
    return `${months[sm - 1]} ${sd} – ${months[em - 1]} ${ed}, ${sy}`;
  }
  return `${months[sm - 1]} ${sd}, ${sy} – ${months[em - 1]} ${ed}, ${ey}`;
}

// ── Internal helpers ──────────────────────────────────────────────────────

/** Convert a local datetime string to a UTC Date using timezone offset calculation */
function toUtcFromLocal(localDatetime: string, timezone: string): Date {
  // Parse the local datetime components
  const match = localDatetime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid local datetime format: ${localDatetime}`);
  }
  const [, yearS, monthS, dayS, hourS, minS, secS] = match;
  const year = Number(yearS);
  const month = Number(monthS);
  const day = Number(dayS);
  const hour = Number(hourS);
  const min = Number(minS);
  const sec = Number(secS);

  // Create a UTC date and use the formatter to find the offset
  // Strategy: guess UTC, check what local time that maps to, adjust
  const guessUtc = new Date(Date.UTC(year, month - 1, day, hour, min, sec));
  const localOfGuess = toLocalComponents(guessUtc, timezone);

  // Offset = (local we want) - (local we got from guess)
  const wantMs = Date.UTC(year, month - 1, day, hour, min, sec);
  const gotMs = Date.UTC(
    localOfGuess.year,
    localOfGuess.month - 1,
    localOfGuess.day,
    localOfGuess.hour,
    localOfGuess.minute,
    localOfGuess.second,
  );
  const offsetMs = wantMs - gotMs;

  const result = new Date(guessUtc.getTime() + offsetMs);

  // Verify (DST edge cases might need a second pass)
  const verify = toLocalComponents(result, timezone);
  const verifyMs = Date.UTC(
    verify.year,
    verify.month - 1,
    verify.day,
    verify.hour,
    verify.minute,
    verify.second,
  );
  if (verifyMs !== wantMs) {
    // DST ambiguity — use the first occurrence
    logger.debug("DST ambiguity detected, using first occurrence", {
      local: localDatetime,
      timezone,
    });
  }

  return result;
}

/** Get local date/time components for a UTC date in a timezone */
function toLocalComponents(
  utcDate: Date,
  timezone: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(utcDate);

  const get = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return Number(part?.value ?? 0);
  };

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === 24 ? 0 : get("hour"), // midnight edge case
    minute: get("minute"),
    second: get("second"),
  };
}

/** Convert a UTC Date to a local ISO-style string (YYYY-MM-DDTHH:MM:SS) */
function toLocalString(utcDate: Date, timezone: string): string {
  const c = toLocalComponents(utcDate, timezone);
  return `${c.year}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}T${String(c.hour).padStart(2, "0")}:${String(c.minute).padStart(2, "0")}:${String(c.second).padStart(2, "0")}`;
}
