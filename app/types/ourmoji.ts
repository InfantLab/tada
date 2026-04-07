/**
 * Ourmoji domain types and DTOs.
 *
 * Re-exports DB-row types from the schema and adds a few client-facing
 * DTO shapes used by composables and components.
 */

import type {
  OurmojiExperimentRun,
  OurmojiExperimentParticipant,
  OurmojiNightAssignment,
  OurmojiSubmission,
  OurmojiNotificationDelivery,
  OurmojiExperimentStatus,
  OurmojiAssignmentRole,
  OurmojiAssignmentCondition,
  OurmojiSubmissionState,
  OurmojiDeliveryChannel,
  OurmojiDeliveryStatus,
} from "~/server/db/schema";

export type {
  OurmojiExperimentRun,
  OurmojiExperimentParticipant,
  OurmojiNightAssignment,
  OurmojiSubmission,
  OurmojiNotificationDelivery,
  OurmojiExperimentStatus,
  OurmojiAssignmentRole,
  OurmojiAssignmentCondition,
  OurmojiSubmissionState,
  OurmojiDeliveryChannel,
  OurmojiDeliveryStatus,
};

/** Daily Ourmoji entry payload as stored in `entries.data`. */
export interface OurmojiDailyData {
  date: string; // YYYY-MM-DD
  emoji: string;
  reflection: string;
  moonPhase: string;
  moonIllumination: number | null;
  wheelOfYear: string | null;
  wheelCategory: string | null;
}

/** Card shape returned to the client for display. */
export interface OurmojiDailyCardDTO {
  id: string;
  date: string;
  emoji: string;
  reflection: string;
  moonPhase: string;
  moonIllumination: number | null;
  wheelOfYear: string | null;
  wheelCategory: string | null;
  timestamp: string;
  timezone: string;
}

/** Stats DTO — active runs return only redacted progress. */
export type OurmojiStatsDTO =
  | {
      state: "active";
      nightsCompleted: number;
      submissionCount: number;
      nightsRemaining: number;
    }
  | {
      state: "completed";
      totals: {
        nightsCompleted: number;
        guesses: number;
        hits: number;
        hitRate: number;
      };
      baseline: { chanceRate: number; sacredSetSize: number };
      binomialPValue: number;
      byCondition: Record<string, unknown>;
      byParticipantAnon: Record<string, unknown>;
    };

/** Morning prompt DTO returned to the receiver. */
export interface OurmojiMorningPromptDTO {
  assignmentId: string;
  experimentRunId: string;
  nightDate: string;
  state: OurmojiSubmissionState;
  hasDream: boolean;
  hasGuess: boolean;
}
