/**
 * GET /api/v1/insights/correlations
 *
 * Analyze correlation between two specific variables
 *
 * User Story 6: Pattern Discovery
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { success, apiError, validationError } from "~/server/utils/response";
import { analyzeCorrelation, calculatePearson } from "~/server/services/insights";

// Query parameter validation
const correlationQuerySchema = z.object({
  variable1: z.string().min(1),
  variable2: z.string().min(1),
  lookback: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(7).max(365))
    .default("90"),
});

export default defineEventHandler(async (event) => {
  // Require entries:read permission
  requirePermission(event, "entries:read");

  const auth = event.context.auth;
  const userId = auth.userId;

  // Parse and validate query parameters
  const rawQuery = getQuery(event);
  const parseResult = correlationQuerySchema.safeParse(rawQuery);

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

  const { variable1, variable2, lookback } = parseResult.data;

  try {
    // Analyze correlation
    const pattern = await analyzeCorrelation(userId, variable1, variable2, lookback);

    // Generate interpretation
    let interpretation: string;
    const absR = Math.abs(pattern.correlation);

    if (absR > 0.7) {
      interpretation = pattern.correlation > 0 ? "strong positive" : "strong negative";
    } else if (absR > 0.5) {
      interpretation = pattern.correlation > 0 ? "moderate positive" : "moderate negative";
    } else if (absR > 0.3) {
      interpretation = pattern.correlation > 0 ? "weak positive" : "weak negative";
    } else {
      interpretation = "no significant";
    }

    // Generate visualization data (scatter plot points would go here in real impl)
    const visualization = {
      type: "scatter",
      description: `Scatter plot showing relationship between ${variable1} and ${variable2}`,
      suggestion: `Plot daily counts of ${variable1} (x-axis) vs ${variable2} (y-axis)`,
    };

    return success(event, {
      variable1,
      variable2,
      correlation: pattern.correlation,
      interpretation: `${interpretation} correlation`,
      confidence: pattern.confidence,
      evidence: pattern.evidence,
      visualization,
      recommendation:
        absR > 0.5
          ? `Strong relationship detected! ${variable1} and ${variable2} appear to be connected.`
          : `Continue tracking both activities to discover potential connections.`,
    });
  } catch (error) {
    console.error("Error analyzing correlation:", error);
    throw createError(
      apiError(
        event,
        "CORRELATION_ANALYSIS_FAILED",
        "Failed to analyze correlation",
        500,
      ),
    );
  }
});
