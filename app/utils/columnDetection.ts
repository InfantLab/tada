/**
 * Auto-detect column mappings from CSV headers
 * Returns mapping suggestions with confidence scores
 */

export interface ColumnDetection {
  field: string;
  csvColumn: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

/**
 * Detect which CSV columns map to our entry fields
 */
export function detectColumnMappings(
  csvHeaders: string[]
): Record<string, ColumnDetection> {
  const detections: Record<string, ColumnDetection> = {};

  // Normalize headers for comparison
  const normalizedHeaders = csvHeaders.map((h) => h.toLowerCase().trim());

  // Patterns for each field type
  const patterns = {
    startedAt: {
      exact: [
        "started at",
        "start time",
        "started",
        "date",
        "datetime",
        "timestamp",
      ],
      partial: ["start", "date", "time", "when"],
    },
    endedAt: {
      exact: ["ended at", "end time", "ended", "finish time", "finished"],
      partial: ["end", "finish", "stop"],
    },
    duration: {
      exact: ["duration", "length", "time spent", "elapsed"],
      partial: ["duration", "time", "length"],
    },
    name: {
      exact: ["name", "activity", "title", "session name", "exercise"],
      partial: ["name", "activity", "title"],
    },
    category: {
      exact: ["category", "type", "kind"],
      partial: ["category", "type"],
    },
    subcategory: {
      exact: ["subcategory", "subtype", "sub category"],
      partial: ["sub", "subcat"],
    },
    notes: {
      exact: ["notes", "description", "comments", "memo"],
      partial: ["note", "desc", "comment"],
    },
    tags: {
      exact: ["tags", "labels", "keywords"],
      partial: ["tag", "label"],
    },
    emoji: {
      exact: ["emoji", "icon", "symbol"],
      partial: ["emoji", "icon"],
    },
  };

  // Check each target field
  for (const [targetField, fieldPatterns] of Object.entries(patterns)) {
    let bestMatch: ColumnDetection | null = null;

    for (let i = 0; i < csvHeaders.length; i++) {
      const header = csvHeaders[i]!;
      const normalized = normalizedHeaders[i]!;

      // Check for exact match
      if (fieldPatterns.exact.some((pattern) => normalized === pattern)) {
        bestMatch = {
          field: targetField,
          csvColumn: header,
          confidence: "high",
          reason: `Exact match: "${header}" matches standard field name`,
        };
        break;
      }

      // Check for partial match
      const partialMatch = fieldPatterns.partial.find((pattern) =>
        normalized.includes(pattern)
      );
      if (partialMatch && (!bestMatch || bestMatch.confidence === "low")) {
        bestMatch = {
          field: targetField,
          csvColumn: header,
          confidence: "medium",
          reason: `Contains "${partialMatch}" in "${header}"`,
        };
      }
    }

    if (bestMatch) {
      detections[targetField] = bestMatch;
    }
  }

  return detections;
}

/**
 * Get confidence color for UI display
 */
export function getConfidenceColor(
  confidence: "high" | "medium" | "low"
): string {
  switch (confidence) {
    case "high":
      return "text-green-600 dark:text-green-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    case "low":
      return "text-red-600 dark:text-red-400";
  }
}

/**
 * Get confidence badge text
 */
export function getConfidenceBadge(
  confidence: "high" | "medium" | "low"
): string {
  switch (confidence) {
    case "high":
      return "✓ High confidence";
    case "medium":
      return "~ Medium confidence";
    case "low":
      return "? Low confidence";
  }
}
