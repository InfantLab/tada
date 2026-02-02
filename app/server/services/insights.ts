/**
 * Insights Service
 *
 * Pattern detection with statistical analysis:
 * - Pearson correlation coefficient
 * - Temporal patterns (weekday distribution)
 * - Trend analysis (linear regression)
 * - Sequence detection (antecedent-consequent)
 * - Confidence level assignment
 */

import { db } from "~/server/db";
import { entries, insightCache } from "~/server/db/schema";
import { eq, and, isNull, gte } from "drizzle-orm";

interface Pattern {
  type: "correlation" | "temporal" | "trend" | "sequence";
  confidence: "low" | "medium" | "high";
  description: string;
  evidence: Record<string, any>;
  message?: string;
  [key: string]: any;
}

/**
 * Calculate Pearson correlation coefficient
 * r = Σ[(x - x̄)(y - ȳ)] / √[Σ(x - x̄)² * Σ(y - ȳ)²]
 */
export function calculatePearson(x: number[], y: number[]): number {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return 0;
  }

  if (x.length === 1) {
    return 0;
  }

  const n = x.length;

  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  // Calculate deviations and products
  let numerator = 0;
  let sumXDevSq = 0;
  let sumYDevSq = 0;

  for (let i = 0; i < n; i++) {
    const xDev = x[i] - meanX;
    const yDev = y[i] - meanY;

    numerator += xDev * yDev;
    sumXDevSq += xDev * xDev;
    sumYDevSq += yDev * yDev;
  }

  // Handle edge cases
  if (sumXDevSq === 0 || sumYDevSq === 0) {
    return 0;
  }

  const denominator = Math.sqrt(sumXDevSq * sumYDevSq);

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

/**
 * Group entries by date
 */
export async function groupByDay(
  userId: string,
  lookbackDays: number,
): Promise<Record<string, any[]>> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  const userEntries = await db.query.entries.findMany({
    where: and(
      eq(entries.userId, userId),
      gte(entries.timestamp, cutoffDate.toISOString()),
      isNull(entries.deletedAt),
    ),
    orderBy: (entries, { asc }) => [asc(entries.timestamp)],
  });

  const grouped: Record<string, any[]> = {};

  for (const entry of userEntries) {
    const date = entry.timestamp.split("T")[0];
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(entry);
  }

  return grouped;
}

/**
 * Analyze correlation between two activity categories
 */
export async function analyzeCorrelation(
  userId: string,
  category1: string,
  category2: string,
  lookbackDays: number,
): Promise<Pattern> {
  const grouped = await groupByDay(userId, lookbackDays);
  const dates = Object.keys(grouped).sort();

  // Count occurrences per day
  const cat1Counts: number[] = [];
  const cat2Counts: number[] = [];

  for (const date of dates) {
    const dayEntries = grouped[date];

    const cat1Count = dayEntries.filter(
      (e) => e.category === category1,
    ).length;
    const cat2Count = dayEntries.filter(
      (e) => e.category === category2,
    ).length;

    cat1Counts.push(cat1Count);
    cat2Counts.push(cat2Count);
  }

  // Need at least 10 data points
  if (dates.length < 10) {
    return {
      type: "correlation",
      confidence: "low",
      description: "Insufficient data for correlation analysis",
      message: "Need at least 10 days of data. Keep logging entries!",
      evidence: {
        sampleSize: dates.length,
        minimumRequired: 10,
      },
      activity1: category1,
      activity2: category2,
      correlation: 0,
    };
  }

  const r = calculatePearson(cat1Counts, cat2Counts);

  // Assign confidence level
  let confidence: "low" | "medium" | "high";
  if (Math.abs(r) > 0.7 && dates.length > 30) {
    confidence = "high";
  } else if (Math.abs(r) > 0.5 && dates.length > 20) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Generate description
  const direction = r > 0 ? "positive" : "negative";
  const strength = Math.abs(r) > 0.7 ? "strong" : Math.abs(r) > 0.5 ? "moderate" : "weak";

  return {
    type: "correlation",
    confidence,
    description: `${strength} ${direction} correlation between ${category1} and ${category2}`,
    activity1: category1,
    activity2: category2,
    correlation: r,
    evidence: {
      sampleSize: dates.length,
      correlation: r,
      description: `Days with ${category1} are ${strength}ly correlated with ${category2}`,
    },
  };
}

/**
 * Analyze weekday pattern for a category
 */
export async function analyzeWeekdayPattern(
  userId: string,
  category: string,
  lookbackDays: number,
): Promise<Pattern> {
  const grouped = await groupByDay(userId, lookbackDays);
  const dates = Object.keys(grouped).sort();

  const weekdayDistribution: Record<string, number> = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  const weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (const date of dates) {
    const dayEntries = grouped[date];
    const categoryEntries = dayEntries.filter((e) => e.category === category);

    if (categoryEntries.length > 0) {
      const dayOfWeek = new Date(date).getDay();
      weekdayDistribution[weekdayNames[dayOfWeek]]++;
    }
  }

  // Find dominant days
  const sortedDays = Object.entries(weekdayDistribution)
    .sort(([, a], [, b]) => b - a)
    .map(([day]) => day);

  const topDay = sortedDays[0];
  const topCount = weekdayDistribution[topDay];

  return {
    type: "temporal",
    confidence: dates.length > 30 ? "high" : dates.length > 20 ? "medium" : "low",
    description: `${category} activities occur most frequently on ${topDay}s`,
    category,
    weekdayDistribution,
    evidence: {
      sampleSize: dates.length,
      topWeekday: topDay,
      topCount,
      description: `Out of ${dates.length} days analyzed, ${topCount} ${topDay}s included ${category}`,
    },
  };
}

/**
 * Analyze trend using linear regression
 * y = mx + b (slope-intercept form)
 */
export async function analyzeTrend(
  userId: string,
  category: string,
  lookbackDays: number,
): Promise<Pattern> {
  const grouped = await groupByDay(userId, lookbackDays);
  const dates = Object.keys(grouped).sort();

  // Calculate total duration per day for category
  const durations: number[] = [];
  const xValues: number[] = [];

  for (let i = 0; i < dates.length; i++) {
    const dayEntries = grouped[dates[i]];
    const categoryEntries = dayEntries.filter((e) => e.category === category);

    const totalDuration = categoryEntries.reduce(
      (sum, e) => sum + (e.durationSeconds || 0),
      0,
    );

    durations.push(totalDuration);
    xValues.push(i);
  }

  if (dates.length < 5) {
    return {
      type: "trend",
      confidence: "low",
      description: "Insufficient data for trend analysis",
      message: "Need at least 5 days of data",
      evidence: {
        sampleSize: dates.length,
      },
      direction: "stable",
      slope: 0,
    };
  }

  // Calculate linear regression slope
  const n = xValues.length;
  const meanX = xValues.reduce((sum, val) => sum + val, 0) / n;
  const meanY = durations.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - meanX) * (durations[i] - meanY);
    denominator += (xValues[i] - meanX) * (xValues[i] - meanX);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // Determine trend direction
  let direction: "increasing" | "decreasing" | "stable";
  if (Math.abs(slope) < 60) {
    // Less than 1 minute/day change
    direction = "stable";
  } else if (slope > 0) {
    direction = "increasing";
  } else {
    direction = "decreasing";
  }

  const confidence =
    dates.length > 30 && Math.abs(slope) > 120
      ? "high"
      : dates.length > 20
        ? "medium"
        : "low";

  return {
    type: "trend",
    confidence,
    description: `${category} duration is ${direction} over time`,
    category,
    direction,
    slope,
    evidence: {
      sampleSize: dates.length,
      avgChange: `${(slope / 60).toFixed(1)} minutes/day`,
      description:
        direction === "stable"
          ? `${category} duration remains consistent`
          : `${category} duration ${direction === "increasing" ? "growing" : "declining"} by ${Math.abs(slope / 60).toFixed(1)} min/day`,
    },
  };
}

/**
 * Detect sequences (antecedent → consequent)
 */
export async function detectSequence(
  userId: string,
  lookbackDays: number,
): Promise<Pattern> {
  const grouped = await groupByDay(userId, lookbackDays);
  const dates = Object.keys(grouped).sort();

  // Track what activities follow what (within same day)
  const sequences: Record<string, Record<string, number>> = {};

  for (const date of dates) {
    const dayEntries = grouped[date].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    for (let i = 0; i < dayEntries.length - 1; i++) {
      const current = dayEntries[i];
      const next = dayEntries[i + 1];

      const key = `${current.name}`;
      if (!sequences[key]) {
        sequences[key] = {};
      }

      const consequent = next.category || next.name;
      if (!sequences[key][consequent]) {
        sequences[key][consequent] = 0;
      }
      sequences[key][consequent]++;
    }
  }

  // Find most common sequence
  let bestAntecedent = "";
  let bestConsequent = "";
  let bestCount = 0;

  for (const [antecedent, consequents] of Object.entries(sequences)) {
    for (const [consequent, count] of Object.entries(consequents)) {
      if (count > bestCount) {
        bestCount = count;
        bestAntecedent = antecedent;
        bestConsequent = consequent;
      }
    }
  }

  if (bestCount < 3) {
    return {
      type: "sequence",
      confidence: "low",
      description: "No strong activity sequences detected",
      message: "Keep logging to discover patterns in your routine",
      evidence: {
        sampleSize: dates.length,
      },
      antecedent: "",
      consequent: "",
    };
  }

  const confidence = bestCount > 10 ? "high" : bestCount > 5 ? "medium" : "low";

  return {
    type: "sequence",
    confidence,
    description: `${bestAntecedent} often leads to ${bestConsequent}`,
    antecedent: bestAntecedent,
    consequent: bestConsequent,
    evidence: {
      sampleSize: dates.length,
      occurrences: bestCount,
      description: `${bestAntecedent} was followed by ${bestConsequent} ${bestCount} times`,
    },
  };
}
