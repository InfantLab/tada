/**
 * useJournalTypeDetection Composable
 * Auto-detects journal subcategory (dream, reflection, gratitude, note) from voice content
 * @composable
 */

export type JournalSubtype =
  | "dream"
  | "reflection"
  | "gratitude"
  | "note"
  | "memory";

export interface DetectionResult {
  /** Detected journal subtype */
  subtype: JournalSubtype;
  /** Confidence score 0-1 */
  confidence: number;
  /** Keywords that triggered detection */
  signals: string[];
  /** Whether LLM was used for detection */
  llmDetected: boolean;
}

// Keyword patterns for each subtype
const DREAM_KEYWORDS = [
  "dream",
  "dreamed",
  "dreamt",
  "dreaming",
  "nightmare",
  "nightmares",
  "sleeping",
  "sleep",
  "woke up",
  "wake up",
  "lucid",
  "surreal",
  "vivid dream",
  "last night",
  "this morning i had",
  "while i was sleeping",
];

const GRATITUDE_KEYWORDS = [
  "grateful",
  "thankful",
  "appreciate",
  "appreciation",
  "blessed",
  "lucky",
  "fortunate",
  "thank",
  "thanks",
  "gratitude",
  "so glad",
  "really glad",
  "happy that",
  "appreciative",
];

const REFLECTION_KEYWORDS = [
  "thinking about",
  "thought about",
  "realized",
  "realizing",
  "wondering",
  "wonder if",
  "pondering",
  "contemplating",
  "reflecting on",
  "looking back",
  "in hindsight",
  "occurred to me",
  "dawned on me",
  "it hit me",
  "come to think",
  "been thinking",
  "on my mind",
  "been considering",
  "mulling over",
];

const MEMORY_KEYWORDS = [
  "remember when",
  "i remember",
  "reminded me of",
  "reminds me",
  "back when",
  "years ago",
  "used to",
  "when i was",
  "as a kid",
  "as a child",
  "nostalgic",
  "nostalgia",
  "the old days",
  "memory of",
  "memories of",
];

interface KeywordMatch {
  keyword: string;
  weight: number;
}

/**
 * Find keyword matches in text
 */
function findMatches(
  text: string,
  keywords: string[],
  baseWeight: number = 1.0,
): KeywordMatch[] {
  const lowerText = text.toLowerCase();
  const matches: KeywordMatch[] = [];

  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      // Longer/more specific keywords get higher weight
      const lengthBonus = Math.min(keyword.length / 20, 0.3);
      matches.push({
        keyword,
        weight: baseWeight + lengthBonus,
      });
    }
  }

  return matches;
}

/**
 * Calculate confidence score from matches
 */
function calculateConfidence(
  matches: KeywordMatch[],
  totalMatches: number,
): number {
  if (matches.length === 0) return 0;

  // Base confidence from number of matches
  const matchScore = Math.min(matches.length / 3, 1.0);

  // Weight bonus
  const avgWeight =
    matches.reduce((sum, m) => sum + m.weight, 0) / matches.length;

  // Exclusivity bonus: higher if this is the only category matched
  const exclusivityBonus = totalMatches === matches.length ? 0.2 : 0;

  return Math.min(
    (matchScore * 0.5 + avgWeight * 0.3 + exclusivityBonus) * 1.2,
    1.0,
  );
}

export interface UseJournalTypeDetectionReturn {
  /**
   * Detect journal subtype from text
   * @param text - The transcribed text to analyze
   * @param llmSuggestion - Optional LLM-suggested subtype to consider
   */
  detectJournalType: (
    text: string,
    llmSuggestion?: { subtype: JournalSubtype; confidence: number },
  ) => DetectionResult;
}

/**
 * Journal type detection from voice content
 */
export function useJournalTypeDetection(): UseJournalTypeDetectionReturn {
  /**
   * Detect journal subtype from text content
   */
  function detectJournalType(
    text: string,
    llmSuggestion?: { subtype: JournalSubtype; confidence: number },
  ): DetectionResult {
    // Find matches for each category
    const dreamMatches = findMatches(text, DREAM_KEYWORDS, 1.2); // Dreams weighted higher
    const gratitudeMatches = findMatches(text, GRATITUDE_KEYWORDS, 1.0);
    const reflectionMatches = findMatches(text, REFLECTION_KEYWORDS, 1.0);
    const memoryMatches = findMatches(text, MEMORY_KEYWORDS, 0.9);

    // Total matches across all categories
    const totalMatches =
      dreamMatches.length +
      gratitudeMatches.length +
      reflectionMatches.length +
      memoryMatches.length;

    // Calculate confidence for each
    const scores: Array<{
      subtype: JournalSubtype;
      confidence: number;
      signals: string[];
    }> = [
      {
        subtype: "dream",
        confidence: calculateConfidence(dreamMatches, totalMatches),
        signals: dreamMatches.map((m) => m.keyword),
      },
      {
        subtype: "gratitude",
        confidence: calculateConfidence(gratitudeMatches, totalMatches),
        signals: gratitudeMatches.map((m) => m.keyword),
      },
      {
        subtype: "reflection",
        confidence: calculateConfidence(reflectionMatches, totalMatches),
        signals: reflectionMatches.map((m) => m.keyword),
      },
      {
        subtype: "memory",
        confidence: calculateConfidence(memoryMatches, totalMatches),
        signals: memoryMatches.map((m) => m.keyword),
      },
    ];

    // Sort by confidence
    scores.sort((a, b) => b.confidence - a.confidence);

    const bestMatch = scores[0]!;

    // If LLM provided a suggestion with high confidence, prefer it
    if (llmSuggestion && llmSuggestion.confidence >= 0.8) {
      // Only override keyword detection if LLM is confident
      // or if keyword detection has low confidence
      if (
        llmSuggestion.confidence > bestMatch.confidence ||
        bestMatch.confidence < 0.5
      ) {
        return {
          subtype: llmSuggestion.subtype,
          confidence: llmSuggestion.confidence,
          signals: [`LLM detected: ${llmSuggestion.subtype}`],
          llmDetected: true,
        };
      }
    }

    // Default to "note" if confidence is too low
    if (bestMatch.confidence < 0.6) {
      return {
        subtype: "note",
        confidence: 0.5,
        signals: [],
        llmDetected: false,
      };
    }

    return {
      subtype: bestMatch.subtype,
      confidence: bestMatch.confidence,
      signals: bestMatch.signals,
      llmDetected: false,
    };
  }

  return {
    detectJournalType,
  };
}
