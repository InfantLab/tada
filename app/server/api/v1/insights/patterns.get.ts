/**
 * GET /api/v1/insights/patterns
 *
 * Detect patterns in user data with statistical analysis
 * Results are cached for 1 hour to improve performance
 *
 * User Story 6: Pattern Discovery
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { success, apiError, validationError } from "~/server/utils/response";
import {
  analyzeCorrelation,
  analyzeWeekdayPattern,
  analyzeTrend,
  detectSequence,
} from "~/server/services/insights";
import { db } from "~/server/db";
import { insightCache } from "~/server/db/schema";
import { eq, and, gte } from "drizzle-orm";

// Query parameter validation
const patternsQuerySchema = z.object({
  lookback: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(7).max(365))
    .default("90"),
  type: z
    .enum(["all", "correlation", "temporal", "trend", "sequence"])
    .default("all"),
  minConfidence: z.enum(["low", "medium", "high"]).default("low"),
  category: z.string().optional(),
});

const CACHE_TTL_HOURS = 1;

export default defineEventHandler(async (event) => {
  // Require entries:read permission (pattern analysis reads entries)
  requirePermission(event, "entries:read");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Parse and validate query parameters
  const rawQuery = getQuery(event);
  const parseResult = patternsQuerySchema.safeParse(rawQuery);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};

    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }

    throw createError(validationError(event, errors));
  }

  const { lookback, type, minConfidence, category } = parseResult.data;

  try {
    // Generate cache key
    const cacheKey = `patterns:${userId}:${lookback}:${type}:${minConfidence}:${category || "all"}`;

    // Check cache
    const now = new Date();
    const cacheExpiry = new Date(now.getTime() - CACHE_TTL_HOURS * 60 * 60 * 1000);

    const cached = await db.query.insightCache.findFirst({
      where: and(
        eq(insightCache.userId, userId),
        eq(insightCache.cacheKey, cacheKey),
        gte(insightCache.createdAt, cacheExpiry.toISOString()),
      ),
    });

    if (cached && cached.result) {
      // Return cached result
      return success(event, {
        patterns: cached.result,
        cached: true,
        cacheAge: Math.floor(
          (now.getTime() - new Date(cached.createdAt).getTime()) / 1000,
        ),
      });
    }

    // No cache hit - calculate patterns
    const patterns: any[] = [];

    // Run pattern detection based on type filter
    if (type === "all" || type === "correlation") {
      // Analyze common category correlations
      const commonPairs = [
        ["mindfulness", "productivity"],
        ["fitness", "mindfulness"],
        ["sleep", "productivity"],
        ["food", "fitness"],
      ];

      for (const [cat1, cat2] of commonPairs) {
        if (!category || category === cat1 || category === cat2) {
          const pattern = await analyzeCorrelation(userId, cat1, cat2, lookback);
          if (pattern.confidence !== "low" || minConfidence === "low") {
            patterns.push(pattern);
          }
        }
      }
    }

    if (type === "all" || type === "temporal") {
      const categories = category
        ? [category]
        : ["mindfulness", "fitness", "productivity", "food"];

      for (const cat of categories) {
        const pattern = await analyzeWeekdayPattern(userId, cat, lookback);
        if (
          pattern.confidence === "high" ||
          (pattern.confidence === "medium" && minConfidence !== "high") ||
          minConfidence === "low"
        ) {
          patterns.push(pattern);
        }
      }
    }

    if (type === "all" || type === "trend") {
      const categories = category
        ? [category]
        : ["mindfulness", "fitness", "productivity"];

      for (const cat of categories) {
        const pattern = await analyzeTrend(userId, cat, lookback);
        if (
          pattern.confidence === "high" ||
          (pattern.confidence === "medium" && minConfidence !== "high") ||
          minConfidence === "low"
        ) {
          patterns.push(pattern);
        }
      }
    }

    if (type === "all" || type === "sequence") {
      const pattern = await detectSequence(userId, lookback);
      if (
        pattern.confidence === "high" ||
        (pattern.confidence === "medium" && minConfidence !== "high") ||
        minConfidence === "low"
      ) {
        patterns.push(pattern);
      }
    }

    // Sort by confidence (high > medium > low)
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    patterns.sort(
      (a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence],
    );

    // Cache the result
    await db.insert(insightCache).values({
      id: crypto.randomUUID(),
      userId,
      cacheKey,
      result: patterns,
      createdAt: now.toISOString(),
    });

    return success(event, {
      patterns,
      cached: false,
      lookbackDays: lookback,
      totalPatterns: patterns.length,
    });
  } catch (error) {
    console.error("Error detecting patterns:", error);
    throw createError(
      apiError(
        event,
        "PATTERN_DETECTION_FAILED",
        "Failed to detect patterns",
        500,
      ),
    );
  }
});
