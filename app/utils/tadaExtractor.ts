/**
 * Tada Extractor
 * Uses LLM to extract multiple tadas from natural language transcription
 * @module utils/tadaExtractor
 */

import type { ExtractedTada, TadaSignificance } from "~/types/extraction";

/** LLM extraction response structure */
export interface LLMExtractionResponse {
  tadas: ExtractedTadaRaw[];
  journal_fallback?: string;
  journal_type?: "dream" | "reflection" | "gratitude" | "note";
}

interface ExtractedTadaRaw {
  title: string;
  notes?: string;
  category?: string;
  subcategory?: string;
  significance?: "minor" | "normal" | "major";
  confidence?: number;
  original_text?: string;
}

/**
 * System prompt for extracting tadas from transcribed speech
 */
export const EXTRACTION_PROMPT = `You are a personal productivity assistant that helps users capture their accomplishments.

Your task is to extract discrete accomplishments ("tadas") from natural speech transcriptions.

RULES:
1. Each tada should be a single, specific accomplishment
2. Split compound sentences into separate tadas (e.g., "I fixed the sink and called my mom" → 2 tadas)
3. Title should be SHORT (5-10 words max) - summarize the accomplishment concisely
4. Put any additional context, details, or the original phrasing in the "notes" field
5. Words like "finally", "at last", "after so long" indicate MAJOR significance
6. Quick/routine tasks are MINOR significance
7. Everything else is NORMAL significance
8. Detect category from context (home, work, health, social, creative, learning, etc.)
9. If no clear tadas are found, provide a journal_fallback summary
10. Detect journal_type from content clues:
   - "dream", "dreamed", "nightmare", "sleeping" → "dream"
   - "grateful", "thankful", "appreciate" → "gratitude"
   - "thinking about", "realized", "wondering" → "reflection"
   - Otherwise → "note"

OUTPUT FORMAT (JSON):
{
  "tadas": [
    {
      "title": "Fixed the kitchen sink",
      "notes": "Finally got around to fixing that leaky kitchen sink that's been bothering me for weeks",
      "category": "home",
      "subcategory": "maintenance",
      "significance": "major",
      "confidence": 0.95,
      "original_text": "finally fixed that kitchen sink"
    }
  ],
  "journal_type": "note",
  "journal_fallback": "Talked about various activities today"
}

Categories: home, work, health, fitness, social, creative, learning, finance, errands, personal
Subcategories vary by category:
- home: cleaning, cooking, maintenance, organizing, gardening
- work: meeting, project, milestone, collaboration, admin
- health: medical, dental, mental, wellness
- fitness: workout, running, yoga, sports
- social: family, friends, networking, community
- creative: art, music, writing, craft, photography
- learning: reading, course, skill, language, research
- finance: banking, investing, budgeting, taxes
- errands: shopping, appointments, admin, travel
- personal: self-care, milestone, hobby, achievement
Journal Types: dream, reflection, gratitude, note`;

/**
 * Validate and normalize extracted tada from LLM response
 */
export function validateExtractedTada(
  raw: ExtractedTadaRaw,
): ExtractedTada | null {
  if (
    !raw.title ||
    typeof raw.title !== "string" ||
    raw.title.trim().length === 0
  ) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    title: raw.title.trim(),
    notes: raw.notes?.trim() || raw.original_text?.trim() || undefined,
    category: normalizeCategory(raw.category),
    subcategory: raw.subcategory?.toLowerCase().trim() || undefined,
    significance: normalizeSignificance(raw.significance),
    confidence: normalizeConfidence(raw.confidence),
    originalText: raw.original_text,
    selected: true, // Default to selected
  };
}

/**
 * Normalize category to known values
 */
function normalizeCategory(category?: string): string {
  if (!category) return "personal";

  const normalized = category.toLowerCase().trim();
  const knownCategories = [
    "home",
    "work",
    "health",
    "fitness",
    "social",
    "creative",
    "learning",
    "finance",
    "errands",
    "personal",
  ];

  return knownCategories.includes(normalized) ? normalized : "personal";
}

/**
 * Normalize significance level
 */
function normalizeSignificance(significance?: string): TadaSignificance {
  if (!significance) return "normal";

  const normalized = significance.toLowerCase().trim();
  if (normalized === "minor" || normalized === "low") return "minor";
  if (normalized === "major" || normalized === "high") return "major";
  return "normal";
}

/**
 * Normalize confidence score to 0-1 range
 */
function normalizeConfidence(confidence?: number): number {
  if (typeof confidence !== "number") return 0.8;
  if (confidence > 1) return confidence / 100; // Handle percentage input
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Parse LLM response JSON and extract tadas
 */
export function parseExtractionResponse(responseText: string): {
  tadas: ExtractedTada[];
  journalFallback?: string;
  journalType?: "dream" | "reflection" | "gratitude" | "note";
  error?: string;
} {
  try {
    // Try to extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;

    // Remove markdown code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim()) as LLMExtractionResponse;

    if (!parsed.tadas || !Array.isArray(parsed.tadas)) {
      return {
        tadas: [],
        journalFallback:
          parsed.journal_fallback || responseText.substring(0, 200),
        journalType: parsed.journal_type,
        error: "No tadas array in response",
      };
    }

    const validTadas = parsed.tadas
      .map((raw) => validateExtractedTada(raw))
      .filter((tada): tada is ExtractedTada => tada !== null);

    return {
      tadas: validTadas,
      journalFallback: parsed.journal_fallback,
      journalType: parsed.journal_type,
    };
  } catch (err) {
    return {
      tadas: [],
      journalFallback: undefined,
      error:
        err instanceof Error
          ? err.message
          : "Failed to parse extraction response",
    };
  }
}

/**
 * Extract tadas from transcription using rule-based fallback
 * Used when LLM is not available or fails
 */
export function extractTadasRuleBased(transcription: string): ExtractedTada[] {
  const tadas: ExtractedTada[] = [];

  console.log("[extractTadasRuleBased] Input:", transcription);

  // Split by common conjunctions and punctuation
  const segments = transcription
    .split(/[,;]|\band\b|\bthen\b|\balso\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  console.log("[extractTadasRuleBased] Segments:", segments);

  // Look for action verbs that indicate accomplishments
  // Expanded to catch more natural speech patterns
  const actionPatterns = [
    // Past tense accomplishment verbs
    /\b(finished|completed|did|done|made|fixed|cleaned|called|sent|wrote|read|cooked|bought|paid|went|visited|met|helped|learned|started|ended|organized|created|built|resolved|worked|figured|managed|got|succeeded|accomplished|achieved|handled|tackled|nailed|crushed|smashed)\b/i,
    // Present perfect ("I have...")
    /\b(have|'ve)\s+(finished|completed|done|made|fixed|cleaned|called|sent|written|read|cooked|bought|paid|gone|visited|met|helped|learned|started|ended|organized|created|built|resolved|worked|figured|managed|got)\b/i,
    // "I [verb]ed the..." patterns
    /\bI\s+\w+ed\b/i,
    // Success indicators
    /\b(success|tada|ta-da|yay|woo|finally|at last)\b/i,
    // Recording/journaling context (for test transcriptions)
    /\b(record|journal|entry|logged|tracked|noted)\b/i,
  ];

  for (const segment of segments) {
    // Check if segment contains action verb
    const hasAction = actionPatterns.some((pattern) => pattern.test(segment));

    console.log(
      "[extractTadasRuleBased] Segment:",
      segment,
      "hasAction:",
      hasAction,
    );

    if (hasAction) {
      // Detect significance from keywords
      const isMajor =
        /\b(finally|at last|after so long|first time|never before)\b/i.test(
          segment,
        );
      const isMinor = /\b(quick|just|briefly|routine)\b/i.test(segment);

      // Detect category from keywords
      const category = detectCategoryFromText(segment);

      // Create a clean title (short) and put the full segment in notes
      const cleanedTitle = cleanTadaTitle(segment);

      tadas.push({
        id: crypto.randomUUID(),
        title: cleanedTitle,
        notes: segment !== cleanedTitle ? segment : undefined, // Only add notes if different from title
        category,
        significance: isMajor ? "major" : isMinor ? "minor" : "normal",
        confidence: 0.6, // Lower confidence for rule-based
        originalText: segment,
        selected: true,
      });
    }
  }

  console.log(
    "[extractTadasRuleBased] Extracted tadas:",
    tadas.length,
    tadas.map((t) => t.title),
  );
  return tadas;
}

/**
 * Clean up tada title from raw segment
 */
function cleanTadaTitle(segment: string): string {
  return (
    segment
      // Remove filler words
      .replace(
        /\b(um|uh|like|you know|so|basically|actually|literally)\b/gi,
        "",
      )
      // Remove leading/trailing non-word characters
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      // Capitalize first letter
      .replace(/^./, (c) => c.toUpperCase())
      .trim()
  );
}

/**
 * Detect category from text keywords
 */
function detectCategoryFromText(text: string): string {
  const categoryKeywords: Record<string, string[]> = {
    home: [
      "house",
      "home",
      "kitchen",
      "bathroom",
      "laundry",
      "dishes",
      "clean",
      "cook",
      "garden",
    ],
    work: [
      "work",
      "office",
      "meeting",
      "email",
      "project",
      "client",
      "boss",
      "deadline",
      "report",
    ],
    health: [
      "doctor",
      "dentist",
      "medicine",
      "appointment",
      "therapy",
      "checkup",
    ],
    fitness: [
      "gym",
      "workout",
      "run",
      "exercise",
      "yoga",
      "walk",
      "bike",
      "swim",
    ],
    social: [
      "friend",
      "family",
      "mom",
      "dad",
      "parent",
      "sibling",
      "call",
      "visit",
      "party",
    ],
    creative: [
      "draw",
      "paint",
      "write",
      "music",
      "art",
      "craft",
      "photo",
      "design",
    ],
    learning: ["read", "book", "learn", "study", "course", "class", "practice"],
    finance: ["bank", "pay", "bill", "budget", "tax", "invest", "money"],
    errands: ["shop", "store", "buy", "pickup", "drop off", "mail", "post"],
  };

  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }

  return "personal";
}

/**
 * Quality rating keywords mapping
 * Maps phrases to ratings 1-5
 */
const QUALITY_KEYWORDS: Record<number, string[]> = {
  5: [
    "great",
    "excellent",
    "amazing",
    "fantastic",
    "wonderful",
    "perfect",
    "best",
    "incredible",
    "awesome",
    "loved it",
    "really good",
  ],
  4: ["good", "nice", "solid", "pretty good", "went well", "happy with"],
  3: ["okay", "ok", "fine", "alright", "decent", "average", "not bad"],
  2: [
    "hard",
    "difficult",
    "challenging",
    "struggled",
    "tough",
    "not great",
    "could be better",
  ],
  1: [
    "terrible",
    "awful",
    "horrible",
    "worst",
    "failed",
    "couldn't",
    "gave up",
    "impossible",
  ],
};

/**
 * Bonus tada trigger phrases
 * Phrases that indicate additional accomplishments beyond the main task
 */
const BONUS_TADA_TRIGGERS = [
  "also i",
  "also I",
  "i also",
  "I also",
  "plus i",
  "plus I",
  "and i also",
  "and I also",
  "besides that",
  "on top of that",
  "additionally",
  "as well",
  "not only that",
  "while i was at it",
  "while I was at it",
];

export interface QualityExtractionResult {
  /** Detected quality rating 1-5, or undefined if not detected */
  quality?: number;
  /** Confidence in the quality rating */
  confidence: number;
  /** The phrase that triggered the quality detection */
  triggerPhrase?: string;
}

export interface BonusTadaResult {
  /** List of bonus tadas mentioned */
  bonusTadas: ExtractedTada[];
  /** The portion of text containing bonus tadas */
  bonusText?: string;
}

/**
 * Extract quality rating from text
 * Maps phrases like "great session" → 5, "okay" → 3, "difficult" → 2
 */
export function extractQualityRating(text: string): QualityExtractionResult {
  const lowerText = text.toLowerCase();

  // Check each quality level, starting from highest
  for (const rating of [5, 4, 3, 2, 1]) {
    const keywords = QUALITY_KEYWORDS[rating] ?? [];
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return {
          quality: rating,
          confidence: keyword.length > 4 ? 0.9 : 0.7, // Longer phrases = higher confidence
          triggerPhrase: keyword,
        };
      }
    }
  }

  return {
    quality: undefined,
    confidence: 0,
  };
}

/**
 * Detect bonus tadas in timer notes
 * Finds phrases like "also I fixed..." or "plus I..."
 */
export function detectBonusTadas(text: string): BonusTadaResult {
  const lowerText = text.toLowerCase();

  // Find bonus trigger
  let bonusStartIndex = -1;
  let triggerPhrase = "";

  for (const trigger of BONUS_TADA_TRIGGERS) {
    const index = lowerText.indexOf(trigger.toLowerCase());
    if (index !== -1 && (bonusStartIndex === -1 || index < bonusStartIndex)) {
      bonusStartIndex = index;
      triggerPhrase = trigger;
    }
  }

  if (bonusStartIndex === -1) {
    return { bonusTadas: [] };
  }

  // Extract the bonus portion of the text
  const bonusText = text
    .substring(bonusStartIndex + triggerPhrase.length)
    .trim();

  // Use rule-based extraction on the bonus text
  const bonusTadas = extractTadasRuleBased(bonusText);

  // If no action verbs found, try to make a tada from the whole bonus text
  if (bonusTadas.length === 0 && bonusText.length > 5) {
    bonusTadas.push({
      id: crypto.randomUUID(),
      title: cleanBonusTitle(bonusText),
      category: detectCategoryFromText(bonusText),
      significance: "normal",
      confidence: 0.5,
      originalText: bonusText,
      selected: true,
    });
  }

  return {
    bonusTadas,
    bonusText,
  };
}

/**
 * Clean up bonus tada title
 */
function cleanBonusTitle(text: string): string {
  const firstSentence =
    text
      // Remove common filler words
      .replace(/\b(um|uh|like|you know|so|basically|actually)\b/gi, "")
      // Truncate at sentence boundary or at reasonable length
      .split(/[.!?]/)[0] ?? text;
  return (
    firstSentence
      // Limit length
      .substring(0, 100)
      // Clean up
      .replace(/\s+/g, " ")
      .trim()
      // Capitalize first letter
      .replace(/^./, (c) => c.toUpperCase())
  );
}

/**
 * Extended extraction result for timer notes
 */
export interface TimerNoteExtractionResult {
  /** Quality rating for the session */
  quality: QualityExtractionResult;
  /** Main session notes (without bonus tadas) */
  mainNotes: string;
  /** Bonus tadas detected */
  bonusTadas: ExtractedTada[];
  /** Journal type if detected */
  journalType?: string;
}

/**
 * Extract structured data from timer voice note
 * Combines quality rating, bonus tadas, and main notes
 */
export function extractTimerNoteData(text: string): TimerNoteExtractionResult {
  const quality = extractQualityRating(text);
  const bonusResult = detectBonusTadas(text);

  // Remove bonus portion from main notes if found
  let mainNotes = text;
  if (bonusResult.bonusText) {
    const bonusStart = text
      .toLowerCase()
      .indexOf(
        BONUS_TADA_TRIGGERS.find((t) =>
          text.toLowerCase().includes(t.toLowerCase()),
        )?.toLowerCase() || "",
      );
    if (bonusStart > 0) {
      mainNotes = text.substring(0, bonusStart).trim();
    }
  }

  return {
    quality,
    mainNotes,
    bonusTadas: bonusResult.bonusTadas,
  };
}
