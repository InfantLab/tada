// Type definitions for Ta-Da! REST API v1
// DO NOT modify this file manually - it is generated from the data model

// ============================================================================
// Permissions
// ============================================================================

export type Permission =
  | 'entries:read'
  | 'entries:write'
  | 'rhythms:read'
  | 'insights:read'
  | 'export:read'
  | 'webhooks:manage'
  | 'user:read';

// ============================================================================
// Webhook Events
// ============================================================================

export type WebhookEvent =
  | 'entry.created'
  | 'entry.updated'
  | 'entry.deleted'
  | 'streak.milestone'
  | 'rhythm.broken'
  | 'rhythm.completed'
  | 'pattern.detected'
  | 'import.completed';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    created?: boolean;
    updated?: boolean;
    deleted?: boolean;
    [key: string]: any;
  };
}

export interface PaginatedResponse<T = any> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// ============================================================================
// Webhook Payload
// ============================================================================

export interface WebhookPayload<T = any> {
  event: WebhookEvent;
  timestamp: string; // ISO 8601
  data: T;
  webhook: {
    id: string;
  };
}

// ============================================================================
// Rate Limiting
// ============================================================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

// ============================================================================
// Insight Types
// ============================================================================

export type InsightType = 'patterns' | 'correlations' | 'summary';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface Pattern {
  type: 'correlation' | 'temporal' | 'trend' | 'sequence';
  confidence: ConfidenceLevel;
  description: string;
  evidence: {
    coefficient?: number; // Pearson r-value
    pValue?: number;
    sampleSize: number;
    [key: string]: any;
  };
}

export interface Correlation {
  variable1: string;
  variable2: string;
  coefficient: number;
  pValue: number;
  sampleSize: number;
  interpretation: string;
}

export interface InsightSummary {
  period: 'today' | 'week' | 'month' | 'year' | 'custom';
  stats: {
    totalEntries: number;
    totalDuration: number;
    uniqueCategories: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  };
  trends?: {
    mood?: number;
    energy?: number;
  };
}

// ============================================================================
// Export Formats
// ============================================================================

export type ExportFormat = 'json' | 'csv' | 'markdown';

export type ObsidianTemplate = 'daily' | 'weekly' | 'monthly';

// ============================================================================
// Import Types
// ============================================================================

export interface ImportPreview {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

export interface ImportResult extends ImportPreview {
  created: number;
  skipped: number;
  durationMs: number;
}

// ============================================================================
// Authentication Context
// ============================================================================

export interface ApiAuthContext {
  userId: string;
  permissions: Permission[];
  apiKeyId?: string;
  sessionId?: string;
  type: 'api_key' | 'session';
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface EntryQueryParams {
  // Filters
  date?: string; // YYYY-MM-DD
  start?: string; // ISO 8601
  end?: string; // ISO 8601
  type?: string;
  category?: string;
  subcategory?: string;
  tags?: string; // comma-separated
  search?: string;

  // Pagination
  limit?: number; // 1-1000, default 100
  offset?: number;

  // Sorting
  sort?: 'timestamp' | 'createdAt' | 'durationSeconds';
  order?: 'asc' | 'desc';
}

export interface ExportQueryParams {
  // Date range
  start?: string;
  end?: string;
  date?: string;

  // Filters
  type?: string;
  category?: string;

  // Format
  format?: ExportFormat;
  template?: ObsidianTemplate;

  // Options
  include?: string; // comma-separated: rhythms,insights,summary
  sections?: string; // comma-separated sections to include
}

export interface InsightQueryParams {
  // Time range
  lookback?: number; // days, default 90, max 365

  // Filters
  type?: 'correlation' | 'temporal' | 'trend' | 'sequence';
  minConfidence?: ConfidenceLevel;
  category?: string;
}
