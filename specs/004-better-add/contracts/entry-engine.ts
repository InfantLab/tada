/**
 * Entry Engine Contracts
 *
 * TypeScript interfaces for the unified entry system.
 * These define the API contract between components.
 *
 * @module specs/004-better-add/contracts/entry-engine
 */

import type { Entry } from "~/server/db/schema";

// =============================================================================
// Entry Types
// =============================================================================

export type EntryType = "timed" | "reps" | "journal" | "tada";
export type EntrySource = "manual" | "voice" | "import" | "timer";
export type Significance = "minor" | "normal" | "major";

// =============================================================================
// Core Input/Output Types
// =============================================================================

/**
 * Canonical input format for creating entries.
 * All entry sources (timer, quick add, voice, import) produce this format.
 */
export interface EntryInput {
  // Required
  type: EntryType;
  name: string;

  // Classification
  category?: string;
  subcategory?: string;
  emoji?: string;

  // Timeline
  timestamp?: string; // ISO 8601, defaults to now
  timezone?: string; // Defaults to user's timezone

  // Type-specific
  durationSeconds?: number; // Required for 'timed'
  count?: number; // Required for 'reps'
  content?: string; // For 'journal' and 'tada'

  // Timed-specific
  startedAt?: string;
  endedAt?: string;

  // Tada-specific
  significance?: Significance;

  // Journal-specific
  mood?: number; // 1-5
  themes?: string[];

  // Metadata
  tags?: string[];
  notes?: string;

  // Tracking
  source?: EntrySource;
  externalId?: string;
}

/**
 * Result of entry creation
 */
export interface CreateEntryResult {
  success: boolean;
  entry?: Entry;
  error?: string;
  conflicts?: ConflictResult;
}

// =============================================================================
// Conflict Detection
// =============================================================================

export type OverlapType =
  | "contains"
  | "contained"
  | "partial-start"
  | "partial-end";
export type ConflictResolution = "allow-both" | "keep-original" | "replace";

/**
 * Describes an overlapping entry
 */
export interface OverlappingEntry {
  id: string;
  name: string;
  timestamp: string;
  durationSeconds?: number;
  overlapType: OverlapType;
}

/**
 * Result from conflict detection
 */
export interface ConflictResult {
  hasConflict: boolean;
  overlappingEntries: OverlappingEntry[];
  suggestedResolution: "allow" | "warn" | "block";
}

/**
 * Options for conflict detection
 */
export interface ConflictDetectorOptions {
  /** User ID to check against */
  userId: string;

  /** Entry being created/updated */
  input: EntryInput;

  /** Entry ID if updating (exclude from overlap check) */
  excludeEntryId?: string;

  /** Resolution strategy if conflict found */
  resolution?: ConflictResolution;
}

// =============================================================================
// Draft Entries
// =============================================================================

/**
 * Draft entry - partially complete entry awaiting confirmation
 */
export interface DraftEntry {
  id: string;
  userId: string;
  input: Partial<EntryInput>;
  parsedFrom?: string; // Original voice text
  confidence?: number; // 0-1
  createdAt: string;
  expiresAt: string;
}

/**
 * Options for saving a draft
 */
export interface SaveDraftOptions {
  /** Original text if from voice */
  parsedFrom?: string;

  /** Parsing confidence */
  confidence?: number;

  /** Custom expiry (default: 24 hours) */
  expiresInHours?: number;
}

// =============================================================================
// Natural Language Parsing
// =============================================================================

/**
 * Result of parsing natural language input
 */
export interface ParsedEntry {
  /** Extracted entry input */
  input: Partial<EntryInput>;

  /** Parsing confidence (0-1) */
  confidence: number;

  /** Which fields were extracted vs defaulted */
  extracted: {
    type: boolean;
    name: boolean;
    duration: boolean;
    count: boolean;
    timestamp: boolean;
    category: boolean;
  };

  /** Original text */
  originalText: string;

  /** Parsing method used */
  method: "pattern" | "llm" | "hybrid";
}

/**
 * Options for natural language parsing
 */
export interface ParseOptions {
  /** Prefer LLM over pattern matching */
  preferLLM?: boolean;

  /** Context hints (e.g., "user usually logs meditation in morning") */
  contextHints?: string[];

  /** Default category if not detected */
  defaultCategory?: string;
}

// =============================================================================
// Activity Suggestions
// =============================================================================

/**
 * Activity suggestion for autocomplete
 */
export interface ActivitySuggestion {
  name: string;
  category?: string;
  subcategory?: string;
  entryType: EntryType;
  useCount: number;
  lastUsedAt: string;
}

// =============================================================================
// Duration Parsing (for DurationPicker component)
// =============================================================================

export type DurationContext = "meditation" | "exercise" | "work" | "general";

/**
 * Result of parsing a duration string
 */
export interface ParsedDuration {
  /** Duration in seconds */
  seconds: number;

  /** Original input string */
  input: string;

  /** Normalized display format ("1h 30m", "45m", "30s") */
  display: string;

  /** Parse confidence (1.0 = exact match, <1.0 = assumed) */
  confidence: number;
}

/**
 * Quick pick preset for duration picker
 */
export interface DurationPreset {
  /** Duration in seconds */
  value: number;

  /** Display label ("20m", "1h") */
  label: string;
}

/**
 * Duration picker component props
 */
export interface DurationPickerProps {
  /** Current value in seconds */
  modelValue: number | null;

  /** Context for preset selection */
  context?: DurationContext;

  /** Show user's recent durations */
  showRecent?: boolean;

  /** Override default presets (in seconds) */
  quickPicks?: number[];

  /** Minimum allowed duration (seconds) */
  minDuration?: number;

  /** Maximum allowed duration (seconds) */
  maxDuration?: number;

  /** Enable mini-stepper controls */
  showStepper?: boolean;
}

/**
 * Duration parser interface
 */
export interface IDurationParser {
  /**
   * Parse a duration string to seconds
   * Handles: "20", "20m", "20min", "1h 30m", "1:30:00", "90 minutes"
   */
  parse(input: string): ParsedDuration | null;

  /**
   * Format seconds to display string
   */
  format(seconds: number): string;

  /**
   * Get presets for a given context
   */
  getPresets(context: DurationContext): DurationPreset[];

  /**
   * Get user's recent durations
   */
  getRecentDurations(userId: string, limit?: number): Promise<number[]>;
}

// =============================================================================
// Count Parsing (for CountPicker component)
// =============================================================================

export type CountContext = "bodyweight" | "weighted" | "cardio" | "general";

/**
 * Quick pick preset for count picker
 */
export interface CountPreset {
  /** Count value */
  value: number;

  /** Display label */
  label: string;
}

/**
 * CountPicker component props
 */
export interface CountPickerProps {
  /** Current value */
  modelValue: number | null;

  /** Context for preset selection */
  context?: CountContext;

  /** Show user's recent counts */
  showRecent?: boolean;

  /** Override default presets */
  quickPicks?: number[];

  /** Minimum allowed count */
  min?: number;

  /** Maximum allowed count */
  max?: number;

  /** Enable mini-stepper controls */
  showStepper?: boolean;

  /** Unit label ("reps", "sets", etc.) */
  unit?: string;
}

/**
 * Count input interface (for CountPicker)
 */
export interface ICountInput {
  /**
   * Get presets for a given context
   */
  getPresets(context: CountContext): CountPreset[];

  /**
   * Get user's recent counts
   */
  getRecentCounts(userId: string, limit?: number): Promise<number[]>;
}

// =============================================================================
// Shared Quick Value Picker (base for Duration & Count pickers)
// =============================================================================

/**
 * Shared base component props for value pickers
 */
export interface QuickValuePickerProps {
  /** Current value */
  modelValue: number | null;

  /** Quick pick presets */
  quickPicks: number[];

  /** User's recent values */
  recentValues?: number[];

  /** Format value for display */
  formatValue: (n: number) => string;

  /** Parse string input to value */
  parseValue: (s: string) => number;

  /** Small step increment (±1 or ±1m) */
  stepSmall: number;

  /** Large step increment (±5 or ±5m) */
  stepLarge: number;

  /** Minimum allowed value */
  min?: number;

  /** Maximum allowed value */
  max?: number;

  /** Input placeholder */
  placeholder?: string;
}

// =============================================================================
// Entry Engine Interface
// =============================================================================

/**
 * Main entry engine interface
 */
export interface IEntryEngine {
  /**
   * Validate entry input
   */
  validate(input: EntryInput): { valid: boolean; errors: string[] };

  /**
   * Check for time overlaps with existing entries
   */
  checkConflicts(options: ConflictDetectorOptions): Promise<ConflictResult>;

  /**
   * Create a new entry
   */
  createEntry(
    userId: string,
    input: EntryInput,
    options?: { resolution?: ConflictResolution },
  ): Promise<CreateEntryResult>;

  /**
   * Save a draft entry
   */
  saveDraft(
    userId: string,
    input: Partial<EntryInput>,
    options?: SaveDraftOptions,
  ): Promise<DraftEntry>;

  /**
   * Get user's draft entries
   */
  getDrafts(userId: string): Promise<DraftEntry[]>;

  /**
   * Commit a draft to a real entry
   */
  commitDraft(draftId: string, input: EntryInput): Promise<CreateEntryResult>;

  /**
   * Discard a draft
   */
  discardDraft(draftId: string): Promise<void>;

  /**
   * Parse natural language to entry input
   */
  parseNaturalLanguage(
    text: string,
    options?: ParseOptions,
  ): Promise<ParsedEntry>;

  /**
   * Get activity suggestions for autocomplete
   */
  getSuggestions(
    userId: string,
    query: string,
    entryType?: EntryType,
  ): Promise<ActivitySuggestion[]>;
}

// =============================================================================
// Composable Interface (Vue)
// =============================================================================

/**
 * Vue composable return type
 */
export interface UseEntryEngineReturn {
  // State
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  drafts: Ref<DraftEntry[]>;

  // Actions
  createEntry: (
    input: EntryInput,
    options?: { resolution?: ConflictResolution },
  ) => Promise<Entry | null>;
  validateInput: (input: EntryInput) => { valid: boolean; errors: string[] };
  checkConflicts: (input: EntryInput) => Promise<ConflictResult>;
  saveDraft: (
    input: Partial<EntryInput>,
    options?: SaveDraftOptions,
  ) => Promise<DraftEntry>;
  commitDraft: (draftId: string, input: EntryInput) => Promise<Entry | null>;
  discardDraft: (draftId: string) => Promise<void>;
  parseText: (text: string, options?: ParseOptions) => Promise<ParsedEntry>;
  getSuggestions: (
    query: string,
    entryType?: EntryType,
  ) => Promise<ActivitySuggestion[]>;

  // Convenience
  createTimedEntry: (
    input: Omit<EntryInput, "type"> & { durationSeconds: number },
  ) => Promise<Entry | null>;
  createRepsEntry: (
    input: Omit<EntryInput, "type"> & { count: number },
  ) => Promise<Entry | null>;
  createJournalEntry: (
    input: Omit<EntryInput, "type">,
  ) => Promise<Entry | null>;
  createTadaEntry: (input: Omit<EntryInput, "type">) => Promise<Entry | null>;
}
