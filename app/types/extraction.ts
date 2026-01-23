/**
 * LLM Extraction Types
 * @module types/extraction
 */

import type { LLMProvider } from "./voice";

/** Tada significance level */
export type TadaSignificance = "minor" | "normal" | "major";

/** Journal subcategory types */
export type JournalSubcategory = "dream" | "reflection" | "gratitude" | "note";

/** Extracted tada from LLM (client-side, not persisted) */
export interface ExtractedTada {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  significance: TadaSignificance;
  selected: boolean;
  confidence: number;
  originalText?: string;
}

/** Journal type detection result */
export interface JournalDetection {
  subcategory: JournalSubcategory;
  confidence: number;
  signals: string[];
}

/** Full extraction result from LLM */
export interface ExtractionResult {
  tadas: ExtractedTada[];
  journalFallback?: string;
  provider: LLMProvider;
  success: boolean;
  error?: string;
  processingTimeMs: number;
}

/** LLM extraction request */
export interface StructureRequest {
  text: string;
  context: "tada" | "journal" | "timer-note";
  provider?: "groq" | "openai" | "anthropic";
  userApiKey?: string;
}

/** LLM extraction response */
export interface StructureResponse {
  tadas: ExtractedTada[];
  journalType: JournalDetection | null;
  confidence: number;
  tokensUsed: number;
}

/** Raw LLM response format (JSON schema) */
export interface LLMExtractionResponse {
  tadas: Array<{
    title: string;
    category: string | null;
    significance: TadaSignificance;
  }>;
  journalType: JournalSubcategory | null;
}

/** Quality rating extraction for timer notes */
export interface QualityRatingExtraction {
  rating: number | null; // 1-5 or null if not detected
  confidence: number;
  phrase: string | null; // The phrase that triggered detection
}

/** Category matching result from rule-based fallback */
export interface CategoryMatchResult {
  category: string;
  subcategory: string | null;
  confidence: number;
  matchedKeywords: string[];
}
