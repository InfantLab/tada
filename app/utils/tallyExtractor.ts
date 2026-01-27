/**
 * Tally Extractor
 * Extracts count-based activities from natural speech
 * Uses rule-based extraction with LLM fallback
 * @module utils/tallyExtractor
 */

export interface ExtractedTally {
  id: string;
  activity: string;
  count: number;
  category?: string;
  subcategory?: string;
  emoji?: string;
  confidence: number;
  originalText?: string;
  selected: boolean;
}

export interface TallyExtractionResult {
  tallies: ExtractedTally[];
  remainingText?: string;
  error?: string;
}

/**
 * Common exercise/activity patterns with their default categories
 */
const ACTIVITY_PATTERNS: Array<{
  patterns: RegExp[];
  activity: string;
  category: string;
  subcategory?: string;
  emoji: string;
}> = [
  // Strength training
  {
    patterns: [/push[- ]?ups?/i, /press[- ]?ups?/i],
    activity: "Push-ups",
    category: "movement",
    subcategory: "strength",
    emoji: "💪",
  },
  {
    patterns: [/pull[- ]?ups?/i, /chin[- ]?ups?/i],
    activity: "Pull-ups",
    category: "movement",
    subcategory: "strength",
    emoji: "💪",
  },
  {
    patterns: [/sit[- ]?ups?/i, /crunche?s?/i],
    activity: "Sit-ups",
    category: "movement",
    subcategory: "strength",
    emoji: "💪",
  },
  {
    patterns: [/squats?/i],
    activity: "Squats",
    category: "movement",
    subcategory: "strength",
    emoji: "🦵",
  },
  {
    patterns: [/lunges?/i],
    activity: "Lunges",
    category: "movement",
    subcategory: "strength",
    emoji: "🦵",
  },
  {
    patterns: [/burpee?s?/i],
    activity: "Burpees",
    category: "movement",
    subcategory: "strength",
    emoji: "🔥",
  },
  {
    patterns: [/plank/i],
    activity: "Planks",
    category: "movement",
    subcategory: "strength",
    emoji: "🧘",
  },
  {
    patterns: [/kettle[- ]?bell?s?/i, /kb/i],
    activity: "Kettlebells",
    category: "movement",
    subcategory: "strength",
    emoji: "🏋️",
  },
  {
    patterns: [/dumb[- ]?bell?s?/i],
    activity: "Dumbbells",
    category: "movement",
    subcategory: "strength",
    emoji: "🏋️",
  },
  {
    patterns: [/deadlift?s?/i],
    activity: "Deadlifts",
    category: "movement",
    subcategory: "strength",
    emoji: "🏋️",
  },
  {
    patterns: [/bench[- ]?press/i],
    activity: "Bench Press",
    category: "movement",
    subcategory: "strength",
    emoji: "🏋️",
  },
  {
    patterns: [/dip?s?\b/i],
    activity: "Dips",
    category: "movement",
    subcategory: "strength",
    emoji: "💪",
  },
  {
    patterns: [/row?s?\b/i],
    activity: "Rows",
    category: "movement",
    subcategory: "strength",
    emoji: "🏋️",
  },

  // Cardio
  {
    patterns: [/jumping[- ]?jack?s?/i, /star[- ]?jump?s?/i],
    activity: "Jumping Jacks",
    category: "movement",
    subcategory: "gym",
    emoji: "⭐",
  },
  {
    patterns: [/step?s?\b/i],
    activity: "Steps",
    category: "movement",
    subcategory: "walking",
    emoji: "👟",
  },
  {
    patterns: [/lap?s?\b/i],
    activity: "Laps",
    category: "movement",
    subcategory: "swimming",
    emoji: "🏊",
  },
  {
    patterns: [/mile?s?\b/i],
    activity: "Miles",
    category: "movement",
    subcategory: "running",
    emoji: "🏃",
  },
  {
    patterns: [/km\b|kilometer?s?/i],
    activity: "Kilometers",
    category: "movement",
    subcategory: "running",
    emoji: "🏃",
  },

  // Creative/Practice
  {
    patterns: [/page?s?\b/i],
    activity: "Pages",
    category: "learning",
    subcategory: "reading",
    emoji: "📖",
  },
  {
    patterns: [/chapter?s?\b/i],
    activity: "Chapters",
    category: "learning",
    subcategory: "reading",
    emoji: "📚",
  },
  {
    patterns: [/song?s?\b/i],
    activity: "Songs",
    category: "creative",
    subcategory: "music",
    emoji: "🎵",
  },
  {
    patterns: [/scale?s?\b/i],
    activity: "Scales",
    category: "creative",
    subcategory: "music",
    emoji: "🎹",
  },

  // Misc countables
  {
    patterns: [/glass(?:es)?\s+(?:of\s+)?water/i, /water/i],
    activity: "Glasses of Water",
    category: "health",
    emoji: "💧",
  },
  {
    patterns: [/rep?s?\b/i],
    activity: "Reps",
    category: "movement",
    subcategory: "strength",
    emoji: "🔄",
  },
  {
    patterns: [/set?s?\b/i],
    activity: "Sets",
    category: "movement",
    subcategory: "strength",
    emoji: "🔢",
  },
];

/**
 * Number word to digit mapping
 */
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

/**
 * Parse a number from text (digits or words)
 */
export function parseNumber(text: string): number | null {
  const cleaned = text.trim().toLowerCase();

  // Try direct number parsing
  const directNum = parseInt(cleaned, 10);
  if (!isNaN(directNum)) return directNum;

  // Try number words
  if (NUMBER_WORDS[cleaned] !== undefined) {
    return NUMBER_WORDS[cleaned];
  }

  // Try compound numbers like "twenty five"
  const parts = cleaned.split(/[\s-]+/);
  if (parts.length === 2) {
    const tens = NUMBER_WORDS[parts[0] || ""];
    const ones = NUMBER_WORDS[parts[1] || ""];
    if (tens !== undefined && ones !== undefined && tens >= 20 && ones < 10) {
      return tens + ones;
    }
  }

  return null;
}

/**
 * Extract tallies from text using rule-based patterns
 */
export function extractTalliesRuleBased(text: string): TallyExtractionResult {
  const tallies: ExtractedTally[] = [];
  let remainingText = text;

  // Pattern: NUMBER ACTIVITY (e.g., "10 push-ups", "twelve squats")
  // Also handles: "did NUMBER ACTIVITY", "completed NUMBER ACTIVITY"
  const countActivityPattern =
    /(?:did\s+|completed\s+|finished\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|\w+(?:\s+\w+)?)\s+([a-z][a-z\s-]*?)(?:\s*(?:,|and|&|\.|$))/gi;

  const matches = [...text.matchAll(countActivityPattern)];

  for (const match of matches) {
    const numberText = match[1];
    const activityText = match[2]?.trim();

    if (!numberText || !activityText) continue;

    const count = parseNumber(numberText);
    if (count === null || count <= 0 || count > 10000) continue;

    // Try to match against known activity patterns
    let foundActivity: (typeof ACTIVITY_PATTERNS)[0] | undefined;
    for (const activityDef of ACTIVITY_PATTERNS) {
      for (const pattern of activityDef.patterns) {
        if (pattern.test(activityText)) {
          foundActivity = activityDef;
          break;
        }
      }
      if (foundActivity) break;
    }

    // Create tally entry
    const tally: ExtractedTally = {
      id: crypto.randomUUID(),
      activity: foundActivity?.activity || formatActivityName(activityText),
      count,
      category: foundActivity?.category || "movement",
      subcategory: foundActivity?.subcategory,
      emoji: foundActivity?.emoji,
      confidence: foundActivity ? 0.95 : 0.7,
      originalText: match[0].trim(),
      selected: true,
    };

    tallies.push(tally);

    // Remove matched text from remaining
    remainingText = remainingText.replace(match[0], " ");
  }

  return {
    tallies,
    remainingText: remainingText.trim() || undefined,
  };
}

/**
 * Format activity name to title case
 */
function formatActivityName(text: string): string {
  return text
    .toLowerCase()
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * LLM prompt for tally extraction
 */
export const TALLY_EXTRACTION_PROMPT = `You are a fitness and activity tracking assistant. Extract count-based activities from natural speech.

Your task is to identify discrete countable activities with their quantities.

RULES:
1. Each activity should have a specific count/number
2. Activity name should be SHORT and clear (1-3 words)
3. Infer the most likely category from context
4. If count is ambiguous, use the most likely interpretation
5. Split multiple activities into separate entries

OUTPUT FORMAT (JSON):
{
  "tallies": [
    {
      "activity": "Push-ups",
      "count": 10,
      "category": "movement",
      "subcategory": "strength",
      "emoji": "💪",
      "confidence": 0.95,
      "original_text": "10 push-ups"
    }
  ],
  "remaining_text": "any text that wasn't about countable activities"
}

Categories (use these values):
- movement (default for exercise/fitness)
- creative (music practice, art)
- learning (reading, studying)
- mindfulness (meditation counts)
- health (water, vitamins)
- accomplishment (tasks completed)

Common subcategories for movement: strength, yoga, running, walking, cycling, swimming, gym, dance`;

/**
 * Parse LLM response for tally extraction
 */
export function parseTallyExtractionResponse(
  responseText: string,
): TallyExtractionResult {
  try {
    // Try to extract JSON from response
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim()) as {
      tallies?: Array<{
        activity: string;
        count: number;
        category?: string;
        subcategory?: string;
        emoji?: string;
        confidence?: number;
        original_text?: string;
      }>;
      remaining_text?: string;
    };

    if (!parsed.tallies || !Array.isArray(parsed.tallies)) {
      return { tallies: [], error: "No tallies array in response" };
    }

    const tallies: ExtractedTally[] = parsed.tallies
      .filter((t) => t.activity && typeof t.count === "number" && t.count > 0)
      .map((t) => ({
        id: crypto.randomUUID(),
        activity: t.activity,
        count: t.count,
        category: t.category || "movement",
        subcategory: t.subcategory,
        emoji: t.emoji,
        confidence: t.confidence ?? 0.8,
        originalText: t.original_text,
        selected: true,
      }));

    return {
      tallies,
      remainingText: parsed.remaining_text,
    };
  } catch (err) {
    return {
      tallies: [],
      error: err instanceof Error ? err.message : "Failed to parse response",
    };
  }
}

/**
 * Main extraction function - tries rule-based first, then LLM fallback
 */
export async function extractTallies(
  text: string,
  options?: {
    useLLM?: boolean;
    llmEndpoint?: string;
  },
): Promise<TallyExtractionResult> {
  // First try rule-based extraction
  const ruleResult = extractTalliesRuleBased(text);

  // If we found tallies with high confidence, return them
  if (ruleResult.tallies.length > 0) {
    const avgConfidence =
      ruleResult.tallies.reduce((sum, t) => sum + t.confidence, 0) /
      ruleResult.tallies.length;
    if (avgConfidence >= 0.8) {
      return ruleResult;
    }
  }

  // If LLM is requested and we didn't get confident results, try LLM
  if (options?.useLLM && options.llmEndpoint) {
    try {
      const response = await fetch(options.llmEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: TALLY_EXTRACTION_PROMPT,
          text,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { result?: string };
        if (data.result) {
          const llmResult = parseTallyExtractionResponse(data.result);
          // Merge LLM results with rule-based results
          if (llmResult.tallies.length > 0) {
            // Deduplicate by activity name
            const existingActivities = new Set(
              ruleResult.tallies.map((t) => t.activity.toLowerCase()),
            );
            const newTallies = llmResult.tallies.filter(
              (t) => !existingActivities.has(t.activity.toLowerCase()),
            );
            return {
              tallies: [...ruleResult.tallies, ...newTallies],
              remainingText:
                llmResult.remainingText || ruleResult.remainingText,
            };
          }
        }
      }
    } catch {
      // LLM failed, fall back to rule-based results
    }
  }

  return ruleResult;
}
