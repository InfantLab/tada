// ============================================================================
// Weekly Rhythms — Domain Types
// ============================================================================

/** Celebration content tiers, ordered by privacy exposure */
export type CelebrationTier =
  | "stats_only"
  | "private_ai"
  | "cloud_factual"
  | "cloud_creative";

/** Message kind discriminator */
export type WeeklyMessageKind = "celebration" | "encouragement";

/** Delivery channel identifiers */
export type DeliveryChannel = "in_app" | "email" | "push";

/** Per-channel toggle for a message kind */
export interface ChannelToggles {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

/** Delivery channel preferences per message kind */
export interface DeliveryChannelPreferences {
  celebration: ChannelToggles;
  encouragement: ChannelToggles;
}

/** User-facing generation schedule times (HH:MM in user's local tz) */
export interface GenerationSchedule {
  encouragementLocalTime: string; // default '15:03'
  celebrationGenerateLocalTime: string; // default '03:33'
  celebrationDeliverLocalTime: string; // default '08:08'
}

/** Message lifecycle status */
export type WeeklyMessageStatus =
  | "generated"
  | "queued"
  | "delivered"
  | "partially_delivered"
  | "failed"
  | "dismissed";

/** Delivery attempt status */
export type DeliveryAttemptStatus =
  | "queued"
  | "sent"
  | "failed"
  | "bounced"
  | "skipped";

/** Chain status within a rhythm win */
export type RhythmChainStatus =
  | "maintained"
  | "extended"
  | "bending"
  | "broken"
  | "quiet";

/** Encouragement momentum classification */
export type MomentumLevel = "quiet" | "steady" | "ahead";

// ============================================================================
// Snapshot DTOs
// ============================================================================

export interface GeneralProgress {
  entryCountsByType: Record<string, number>;
  sessionDurationsByCategory: Record<string, number>;
  weekOverWeek: {
    entryCountDelta: number;
    durationDeltaSeconds: number;
    byType: Record<string, number>;
    byCategorySeconds: Record<string, number>;
  };
  personalRecordsThisMonth: PersonalRecord[];
  quietWeek: boolean;
}

export interface PersonalRecord {
  type: string;
  label: string;
  value: number;
  unit: string;
  happenedAt: string;
}

export interface RhythmWin {
  rhythmId: string;
  rhythmName: string;
  chainType: string;
  chainStatus: RhythmChainStatus;
  achievedTier: string;
  completedDays: number;
  totalSeconds: number;
  totalCount: number;
  allTimeMilestones: Array<{ label: string; value: number; unit: string }>;
  stretchGoal?: string;
}

export interface EncouragementContext {
  trailingFourWeekAverages: {
    totalEntries: number;
    totalDurationSeconds: number;
    byRhythmCompletedDays: Record<string, number>;
  };
  generalMomentum: MomentumLevel;
}

// ============================================================================
// Rendered Content
// ============================================================================

export interface SummaryBlock {
  section: "general_progress" | "rhythm_wins" | "stretch_goals" | "footer";
  heading: string;
  lines: string[];
}

/** The only payload shape that may cross into AI rendering */
export interface WeeklyNarrativeInput {
  kind: WeeklyMessageKind;
  weekLabel: string;
  timezone: string;
  generalProgress: {
    countsByType: Record<string, number>;
    durationByCategorySeconds: Record<string, number>;
    weekOverWeek: {
      entryCountDelta: number;
      durationDeltaSeconds: number;
      byType: Record<string, number>;
    };
    monthlyHighlights: Array<{
      label: string;
      value: number;
      unit: string;
    }>;
    quietWeek: boolean;
  };
  rhythmWins: Array<{
    rhythmName: string;
    chainStatus: string;
    achievedTier: string;
    completedDays: number;
    milestones: string[];
    stretchGoal?: string;
  }>;
}

/** Response shape for GET /api/weekly-rhythms/current */
export interface CurrentWeeklySurface {
  encouragement: WeeklySurfaceMessage | null;
  celebration: WeeklySurfaceMessage | null;
}

export interface WeeklySurfaceMessage {
  id: string;
  weekStartDate: string;
  title: string;
  summaryBlocks: SummaryBlock[];
  narrativeText: string | null;
  dismissedAt: string | null;
}

/** Capability flags returned alongside settings */
export interface WeeklyCapabilities {
  privateAiAvailable: boolean;
  cloudAiAvailable: boolean;
  pushAvailable: boolean;
}
