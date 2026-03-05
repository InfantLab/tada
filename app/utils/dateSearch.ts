/**
 * Parse free-text date queries into date ranges.
 *
 * Supports patterns like:
 *   "march 4, 2024"    -> single day
 *   "march 4 2024"     -> single day
 *   "4 march 2024"     -> single day
 *   "march 2024"       -> full month
 *   "2024-03-04"       -> single day (ISO)
 *   "2024-03"          -> full month (ISO)
 *   "2024"             -> full year
 *   "march"            -> that month in the current year
 *   "yesterday"        -> yesterday's date
 *   "today"            -> today's date
 *
 * Returns null if the query doesn't look like a date.
 */

const MONTHS: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function dayRange(year: number, month: number, day: number): DateRange {
  const d = `${year}-${pad(month + 1)}-${pad(day)}`;
  return { from: d, to: d };
}

function monthRange(year: number, month: number): DateRange {
  const last = lastDayOfMonth(year, month);
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(last)}`,
  };
}

function yearRange(year: number): DateRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function parseDateSearch(query: string): DateRange | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const now = new Date();
  const currentYear = now.getFullYear();

  // "today"
  if (q === "today") {
    const y = currentYear;
    const m = now.getMonth();
    const d = now.getDate();
    return dayRange(y, m, d);
  }

  // "yesterday"
  if (q === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return dayRange(y.getFullYear(), y.getMonth(), y.getDate());
  }

  // ISO: "2024-03-04"
  const isoDay = q.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDay) {
    const [, ys, ms, ds] = isoDay;
    return dayRange(parseInt(ys!), parseInt(ms!) - 1, parseInt(ds!));
  }

  // ISO month: "2024-03"
  const isoMonth = q.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMonth) {
    const [, ys, ms] = isoMonth;
    return monthRange(parseInt(ys!), parseInt(ms!) - 1);
  }

  // Year only: "2024" (but only reasonable years)
  const yearOnly = q.match(/^(20\d{2})$/);
  if (yearOnly) {
    return yearRange(parseInt(yearOnly[1]!));
  }

  // "march 4, 2024" or "march 4 2024"
  const monthDayYear = q.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDayYear) {
    const m = MONTHS[monthDayYear[1]!];
    if (m !== undefined) {
      return dayRange(parseInt(monthDayYear[3]!), m, parseInt(monthDayYear[2]!));
    }
  }

  // "4 march 2024" or "4th march 2024"
  const dayMonthYear = q.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})$/);
  if (dayMonthYear) {
    const m = MONTHS[dayMonthYear[2]!];
    if (m !== undefined) {
      return dayRange(parseInt(dayMonthYear[3]!), m, parseInt(dayMonthYear[1]!));
    }
  }

  // "march 2024"
  const monthYear = q.match(/^([a-z]+)\s+(\d{4})$/);
  if (monthYear) {
    const m = MONTHS[monthYear[1]!];
    if (m !== undefined) {
      return monthRange(parseInt(monthYear[2]!), m);
    }
  }

  // "march 4" (current year assumed)
  const monthDay = q.match(/^([a-z]+)\s+(\d{1,2})$/);
  if (monthDay) {
    const m = MONTHS[monthDay[1]!];
    if (m !== undefined) {
      return dayRange(currentYear, m, parseInt(monthDay[2]!));
    }
  }

  // "4 march" or "4th march" (current year assumed)
  const dayMonth = q.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)$/);
  if (dayMonth) {
    const m = MONTHS[dayMonth[2]!];
    if (m !== undefined) {
      return dayRange(currentYear, m, parseInt(dayMonth[1]!));
    }
  }

  // Month name only: "march" (current year)
  const monthOnly = MONTHS[q];
  if (monthOnly !== undefined) {
    return monthRange(currentYear, monthOnly);
  }

  return null;
}
